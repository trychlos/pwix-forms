/*
 * pwix:forms/src/client/classes/checker.class.js
 *
 * Checker aims to:
 * - maybe manage an error message stack at its level, unless it delegates this task to a parent Checker
 * - manage the global validity status at this same level.
 *
 * Checker will receive its events either from a child Checker, or from its own embedded Field's.
 *
 * Error messages:
 *  Even if we are talking about error messages, we actually manage the typed TM.TypedMessage emitted by the sub-components and check functions.
 *  Checker manages them via the IOrderableStack interface.
 *
 * Validity status:
 *  Correlatively to recurrent elementary and global checks, the validity status of the edited entiy (resp. entities) is recomputed.
 *  Checker considers that TypedMessage of 'ERROR' type are blocking and errors. All other messages let the dialog/page to be saved.
 *
 * Instanciation:
 *  The Checker must be instanciated as a ReactiveVar content inside of an autorun() from onRendered():
 *  ```
 *      Template.my_app_template.onCreated( function(){
 *          const self = this;
 *          self.checker = new ReactiveVar( null );
 *      });
 *      Template.my_app_template.onRendered( function(){
 *          const self = this;
 *          self.autorun(() => {
 *              self.checker.set( new Forms.Checker({
 *                  ...args
 *              }));
 *          });
 *      });
 *  ```
 *
 * Validity consolidation:
 *  All underlying components/pane/panels/Forms.Checker's may advertize their own validity status through:
 *  - a 'form-validity' event, holding data as { emitter, ok, ... }
 *  - a call to Checker.formValidity( emitter, ok, .. })
 *      where:
 *       > emitter must uniquely identify the panel, among all validity periods if relevant
 *       > ok must be true or false, and will be and-ed with other individual validity status to provide the global one
 *       > other datas are up to the emitter, and not kept there.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

import { Base } from '../../common/classes/base.class.js';

import { CheckerHandled } from './checker-handled.class.js';

import { IMessager } from '../../common/interfaces/imessager.iface.js';

//export class EntityChecker extends mix( Base ).with( IMessagesOrderedSet, IMessagesSet ){
export class Checker extends Base {

    // static data

    // static methods

    // private data

    // instanciation parameters
    #args = null;

    // configuration
    #defaultConf = {
        instance: null,
        parent: null,
        messager: null,
        fields: null,
        validityEvent: 'checker-validity.forms'
   };
    #conf = {};

    // runtime data

    // the event target
    // this is the first top node of the Blaze instance DOM
    #eventReceiver = null;

    // the consolidated data parts for each underlying component / pane / panel / FormChecker
    #dataParts = new ReactiveDict();

    // the entity-level validity status
    #valid = new ReactiveVar( false );

    // the children Checker's
    #forms = [];

    // private methods

    // returns the field definition which is the source of this input event, or null
    _fieldFromInputEvent( event ){
        const fields = this._getFields();
        const instance = this._getInstance();
        let field = null;
        if( instance && fields ){
            Object.keys( fields ).every(( name ) => {
                const def = fields[name];
                if( def.js ){
                    const js = def.js.substring( 1 );
                    if( instance.$( event.target ).hasClass( js )){
                        field = def;
                    }
                }
                return field !== null;
            });
        }
        return field;
    }

    // returns the fields definition, may be null or empty
    _getFields(){
        return this.#conf.fields;
    }

    // returns the Blaze.TemplateInstance defined at instanciation time, may be null
    _getInstance(){
        return this.#conf.instance;
    }

    // returns the validity event, always set
    _getValidityEvent(){
        return this.#conf.validityEvent;
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    _inputHandler( event ){
        console.debug( 'inputHandler', event );
        const field = this._fieldFromInputEvent( event );
        if( field ){
            console.debug( 'to be handled', field );
        } else {
            console.debug( 'already handled' );
        }
        //console.debug( 'inputHandler', event, 'handled', event.data.number(), event.data.handled());
        //console.debug( event.currentTarget, typeof event.currentTarget );
        //console.debug( this.#eventReceiver );
        //console.debug( 'whether this input handler is our own or bubbled up from a child: ', _.isEqual( this.#eventReceiver, event.currentTarget ) ? 'our own' : 'bubbled up' );
        /*
        if( event.data.handled()){
            console.debug( 'already handled' );
        } else {
            console.debug( 'to handle' );
            //event.data = event.data || {};
            //event.data.Checker = event.data.Checker || {};
            event.data.handled( true );
        }
            */
    }

    // install the events handlers
    //  - requires to have an (Blaze.TemplateInstance) instance
    //  - install an input handler if we have fields
    //  - always install a validity handler
    _installEventsHandlers(){
        const self = this;
        const instance = self._getInstance();
        if( instance ){
            const node = instance.firstNode;
            const $node = instance.$( node );
            if( $node.length ){
                self.#eventReceiver = node;
                const fields = self._getFields();
                if( fields && Object.keys( fields ).length ){
                    $node.on( 'input', ( event ) => { self._inputHandler( event ); });
                }
                const validityEvent = self._getValidityEvent();
                $node.on( validityEvent, ( event, data ) => { self._validityHandler( event, data ); });
            }
        }
    }

    // validity handler
    _validityHandler( event, data ){
        console.debug( 'validityHandler', event, data );
    }

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new Checker instance
     * @param {Object} args an optional arguments object with following keys:
     *  - instance: an optional Blaze.TemplateInstance which materializes the Checker display
     *      > let us defines autorun() functions
     *      > provides a '$' jQuery operator which is tied to this instance
     *      > provides the DOM element which will act as a global event receiver
     *      > provides the topmost DOM element to let us find all managed fields
     *  - parent: an optional parent Checker instance
     *  - messager: an IMessager implementation
     *      > this is a caller's design decision to have a message zone per panel, ou globalized at a higher level
     *      > caller doesn't need to addresses a globalized messager at any lower panel: it is enough to identify the parent parent
     *  - fields: an optional object which defines the managed fields
     *  - validityEvent: if set, the event used to advertize of each Checker validity status, defaulting to 'checker-validity'

    /////*  - $top: an optional jQuery object which should be a common ancestor of all managed fields, will act both as a common source for all fields searches and as an event receiver
     *  - tm: an optional object which implements the TM.ITypedMessage interface
     /////*  - fieldsSet: a FieldSet instance which contains all fields definitions
     *  - fields: an array of fields to be managed here
     *  - $ok: an optional jQuery object which defines the OK button (to enable/disable it)
     *  - okSetFn( valid<Boolean> ): an optional function to be called when OK button must be enabled / disabled
     *  - $err: an optional jQuery object which defines the error message place
     *  - errSetFn( message<String> ): an optional function to be called to display an error message
     *  - errClearFn(): an optional function to be called to clear all messages
     *      Because we want re-check all fields on each input event, in the same way each input event re-triggers all error messages
     *      So this function to let the application re-init its error messages stack.
     * @returns {Checker} this Checker instance
     */
    constructor( args={} ){
        assert( !args || _.isObject( args ), 'when set, options must be a plain javascript Object' );
        if( args ){
            assert( !args.instance || args.instance instanceof Blaze.TemplateInstance, 'when set, instance must be a Blaze.TemplateInstance instance');
            assert( !args.parent || args.parent instanceof Checker, 'when set, parent must be a Checker instance' );
            assert( !args.messager || args.messager instanceof IMessager, 'when set, messager must be a IMessager instance' );
            assert( !args.fields || _.isObject( args.fields ), 'when set, fields must be a plain javascript object' );
            assert( !args.validityEvent || _.isString( args.validityEvent ), 'when set, validityEvent must be a string' );
        }

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#args = args;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );

        // initialize runtime data

        // install events handlers if we have an instance
        this._installEventsHandlers();

        // connect to events receiver element to handle 'panel-data' (or 'form-validity') events
        //if( this.#conf.$top ){
        //    this.#conf.$top.on( this.#conf.validityEvent, ( event, data ) => {
         //       self.formValidity( data );
            //});
        //}

        // define an autorun which reacts to dataParts changes to set the global validity status
        if( this.#conf.instance ){
            this.#conf.instance.autorun(() => {
                let ok = true;
                Object.keys( self.#dataParts.all()).every(( emitter ) => {
                    ok &&= self.#dataParts.get( emitter );
                    return ok;
                });
                self.#valid.set( ok );
            });
        }

        // define an autorun which will enable/disable the OK button depending of the entity validity status
        if( this.#conf.instance ){
            this.#conf.instance.autorun(() => {
                const valid = self.#valid.get();
                if( self.#conf.$ok ){
                    self.#conf.$ok.prop( 'disabled', !valid );
                }
                if( self.#conf.okSetFn ){
                    self.#conf.okSetFn( valid );
                }
            });
        }

        console.debug( this );
        return this;
    }

    /**
     * @summary The EntityChecker's correspondant of FormChecker.check() method
     *  In FormChecker: the corresponding field is checked on each input event. If the current value of the field is valid, then all other fields of the form
     *  (but this one) are re-checked so that we get the full error message set.
     *  When we have an EntityChecker, then it is able to re-cgeck every registered FormChecker with these same parms.
     * @param {Object} args an option object with following keys:
     *  - field: if set, indicates a field to not check (as just already validated from an input handler)
     *      (note that this field is only relevant for the FormChecker which has triggered us)
     *  - display: if set, then says whether checks have any effect on the display, defaulting to true
     *  - msgerr: if set, says if error message are to be displayed, defaulting to true
     *  - update: if set, then says whether the value found in the form should update the edited object, defaulting to true
     *  - $parent: if set, a jQuery element which acts as the parent of the form
     *
     * This doesn't return anything.
     */
    check( args={} ){
        this.errorClear();
        let promises = [];
        this.#forms.every(( form ) => {
            promises.push( form.check( args ).then(( valid ) => {
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
    formValidity( o ){
        assert( o && _.isObject( o ), 'EntityChecker.formValidity() wants a plain javascript Object' );
        assert( o.emitter && _.isString( o.emitter ) && o.emitter.length, 'EntityChecker.formValidity() wants an non-empty emitter' );
        assert( _.isBoolean( o.ok ), 'EntityChecker.formValidity() wants a boolean validity status' );
        this.#dataParts.set( o.emitter, o.ok );
    }
}
