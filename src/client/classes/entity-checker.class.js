/*
 * /src/client/classes/entity-checker.class.js
 *
 * EntityChecker has for goal to:
 * - manage error messages inside of a dialog as well as a page, whether they embed a single panel or several multi-levels tabbed sub-components
 * - manage the global validity status at this same level.
 * 
 * Most often, EntityChecker will receives its events from FormChecker, but not only, and any component is able to triggers EntityChecker, either
 * through jQuery events or by calling its methods.
 * An EntityChecker doesn't manage any form by itself, but manages a global result for a whole entity, and typically an aggregation of the validity status
 * of several forms.
 * 
 * Error messages:
 *  Even if we are talking about error messages, we actually manage any typed TypedMessage emitted by the sub-components. All messages sents are
 *  stacked. The object responsible for the messages display may call the IMessagesOrderedSetLast() interface to get the last message to be displayed.
 *  Because FormChecker re-checks all data every time a field is valid, then the messages stack can be cleared through the IMessagesSetClear() interface,
 *  before being pushed again.
 * 
 * Validity status:
 *  Correlatively to recurrent elementary and global checks, the validity status of the edited entiy (resp. entities) is recomputed.
 *  EntityChecker considers that TypedMessage of 'ERROR' type are blocking and errors. All other messages do not prevent the dialog/page
 *  to be saved.
 * 
 * Instanciation:
 *  The EntiyChecker must be instanciated as a ReactiveVar content inside of an autorun() from onRendered():
 *  ```
 *      Template.my_app_template.onCreated( function(){
 *          const self = this;
 *          self.entityChecker = new ReactiveVar( null );
 *      });
 *      Template.my_app_template.onRendered( function(){
 *          const self = this;
 *          self.autorun(() => {
 *              self.entityChecker.set( new Forms.EntityChecker( self, {
 *                  options
 *              }));
 *          });
 *      });
 *  ```
 * 
 * Validity consolidation:
 *  All underlying components/pane/panels/FormChecker's may advertize their own validity status through:
 *  - a 'panel-validity' event, holding data as { emitter, ok, ... }
 *  - a call to EntityChecker.panelValidity( emitter, ok, .. })
 *      where:
 *       > emitter must uniquely identify the panel, among all validity periods if relevant
 *       > ok must be true or false, and will be and-ed with other individual validity status to provide the global one
 *       > other datas are up to the emitter, and not kept here.
 * 
 * Configuration options are provided at instanciation time as an object with following keys:
 * 
 *  - $topmost: if set, a jQuery object which holds the main (top) dialog or page, and on which EntityChecker can connect to handle events
 *  - $ok: if set, the jQuery object which defines the OK button (to enable/disable it)
 *  - okSetFn( valid<Boolean> ): if set, a function to be called when OK button must be enabled / disabled
 *  - $err: if set, the jQuery object which defines the error message place
 *  - errSetFn( message<String> ): if set, a function to be called to display an error message
 *  - errClearFn(): if set, a function to be called to clear all messages
 *      Because we want re-check all fields on each input event, in the same way each input event re-triggers all error messages
 *      So this function to let the application re-init its error messages stack.
 *  - validityEvent: if set, the validity event sent by underlying components to advertize of their individual validity status, defaulting to 'panel-validity'
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';

import { caBase } from '../../common/classes/base.class.js';

import { IMessagesOrderedSet } from '../../common/interfaces/imessages-ordered-set.iface.js';
import { IMessagesSet } from '../../common/interfaces/imessages-set.iface.js';
import { ITypedMessage } from '../../common/interfaces/ityped-message.iface.js';

//export class LooseDynRegistrar extends mix( izProvider ).with( IRegistrant, IIDGenerator, ISecretGenerator ){
export class EntityChecker extends mix( caBase ).with( IMessagesOrderedSet, IMessagesSet ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #options = null;

    // configuration
    #defaultConf = {
        $topmost: null,
        $ok: null,
        okSetFn: null,
        $err: null,
        errSetFn: null,
        errClearFn: null,
        validityEvent: 'panel-validity'
    };
    #conf = {};

    //runtime data

    // the consolidated data parts for each underlying component / pane / panel / FormChecker
    #dataParts = new ReactiveDict();

    // the entity-level validity status
    #valid = new ReactiveVar( false );

    // the subordinate FormChecker's
    #forms = [];

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new EntityChecker instance
     * @param {Blaze.TemplateInstance} instance
     * @param {Object} opts
     * @returns {EntityChecker} this EntityChecker instance
     */
    constructor( instance, opts={} ){
        super( ...arguments );
        const self = this;

        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance must be a Blaze.TemplateInstance');
        assert( !opts || _.isObject( opts ), 'when set, options must be a plain javascript Object' );
        if( opts ){
            assert( !opts.$topmost || opts.$topmost instanceof jQuery, 'when set, options.$topmost must be a jQuery object' );
            assert( !opts.$ok || opts.$ok instanceof jQuery, 'when set, options.$ok must be a jQuery object' );
            assert( !opts.okSetFn || _.isFunction( opts.okSetFn ), 'when set, options.okSetFn must be a function' );
            assert( !opts.$err || opts.$err instanceof jQuery, 'when set, options.$err must be a jQuery object' );
            assert( !opts.errSetFn || _.isFunction( opts.errSetFn ), 'when provided, options.errSetFn must be a function' );
            assert( !opts.errClearFn || _.isFunction( opts.errClearFn ), 'when provided, options.errClearFn must be a function' );
        }

        // keep the provided params
        this.#instance = instance;
        this.#options = opts;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, opts );

        // initialize runtime data

        // connect to topmost element to handle 'panel-data' events
        if( this.#conf.$topmost && this.#conf.$topmost.length ){
            this.#conf.$topmost.on( this.#conf.validityEvent, ( event, data ) => {
                self.panelValidity( data );
            });
        }

        // define an autorun which reacts to dataParts changes to set the global validity status
        this.#instance.autorun(() => {
            let ok = true;
            Object.keys( self.#dataParts.all()).every(( emitter ) => {
                ok &&= self.#dataParts.get( emitter );
                return ok;
            });
            self.#valid.set( ok );
        });

        // define an autorun which will enable/disable the OK button depending of the entity validity status
        this.#instance.autorun(() => {
            const valid = self.#valid.get();
            if( self.#conf.$ok && self.#conf.$ok.length ){
                self.#conf.$ok.prop( 'disabled', !valid );
            }
            if( self.#conf.okSetFn ){
                self.#conf.okSetFn( valid );
            }
        });

        console.debug( this );
        return this;
    }

    /**
     * @summary The EntityChecker's correspondant of FormChecker.check() method
     *  In FormChecker: the corresponding field is checked on each input event. If the current value of the field is valid, then all other fields of the form
     *  (but this one) are re-checked so that we get the full error message set.
     *  When we have an EntityChecker, then it is able to re-cgeck every registered FormChecker with these same parms.
     * @param {Object} opts an option object with following keys:
     *  - field: if set, indicates a field to not check (as just already validated from an input handler)
     *      (note that this field is only relevant for the FormChecker which has triggered us)
     *  - display: if set, then says whether checks have any effect on the display, defaulting to true
     *  - msgerr: if set, says if error message are to be displayed, defaulting to true
     *  - update: if set, then says whether the value found in the form should update the edited object, defaulting to true
     *  - $parent: if set, a jQuery element which acts as the parent of the form
     * 
     * This doesn't return anything.
     */
    check( opts={} ){
        this.errorClear();
        let promises = [];
        this.#forms.every(( form ) => {
            promises.push( form.check( opts ).then(( valid ) => {
                if( _.isBoolean( valid )){

                }
                return valid;
            }));
            return true;
        });
        Promise.allSettled( promises ).then(( results ) => {
            results.forEach(( res ) => {
                Meteor.isDevelopment && res.status === 'rejected' && console.warn( res );
            });
            Meteor.isDevelopment && this.IMessagesSetDump();
        });
    }

    /**
     * @summary Clears the error message place, and the error messages stack
     */
    errorClear(){
        this.IMessagesSetClear();
        this.#dataParts.clear();
        if( this.#conf.$err && this.#conf.$err.length ){
            $err.val( '' );
        }
        if( this.#conf.errSetFn ){
            this.#conf.errSetFn( '' );
        }
        if( this.#conf.errClearFn ){
            this.#conf.errClearFn();
        }
    }

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    errorSet( tm ){
        this.IMessagesSetPush( tm );
        if( this.#conf.$err && this.#conf.$err.length ){
            $err.val( tm.ITypedMessageMessage());
        }
        if( this.#conf.errSetFn ){
            this.#conf.errSetFn( tm.ITypedMessageMessage());
        }
    }

    /**
     * @summary Register a child FormChecker
     *  When registered, FormChecker's are re-checked every time the need arises
     * @param {FormChecker} form
     */
    formRegister( form ){
        this.#forms.push( form );
    }

    /**
     * @summary Let an underlying component / pane / panel / FormChecker advertize of its individual validity status
     * @param {Object} o with following keys:
     *  - emitter: a unique emitter identifier
     *  - ok: the validity status of the individual component
     */
    panelValidity( o ){
        assert( o && _.isObject( o ), 'EntityChecker.panelValidity() wants a plain javascript Object' );
        assert( o.emitter && _.isString( o.emitter ) && o.emitter.length, 'EntityChecker.panelValidity() wants an non-empty emitter' );
        assert( _.isBoolean( o.ok ), 'EntityChecker.panelValidity() wants a boolean validity status' );
        this.#dataParts.set( o.emitter, o.ok );
    }
}
