/*
 * pwix:forms/src/client/classes/checker.class.js
 *
 * Checker aims to industrialize and homogeneize the management of any of our input forms:
 * - let the application provides its check per fields
 * - provides indicators to show to the user the mandatory character f the fields and its check status
 * - manage a TypedMessage's error message stack.
 *
 * Checker is bound to a Blaze.TemplateInstance. When your form is built with several Blaze components,
 * then you will have a tree of Checker's which will all cooperate together to produce consollidated results.
 *
 * Array-ed panels:
 *  Checker doesn't manage array-ed forms. In this case, you should have a template per row in your array, and so a Checker per row.
 *  Checker expects each such row have its own identifier, and an 'id' string or function must be provided at instanciation time.
 *
 * Error messages:
 *  Even if we are talking about error messages, we actually manage TM.TypedMessage's emitted by the sub-components and check functions.
 *  Checker manages them via an 'IMessager' interface which let us have a stack of messages.
 *
 * Validity status:
 *  Correlatively to recurrent elementary and global checks, the validity status of the edited entiy (resp. entities) is recomputed.
 *  For each individual field check, Checker expects to get:
 *  - either a 'null' answer, which means that all is fine and nothing is to be sait about that,
 *  - or a TypedMessage which may indicates an info to be displayed, or a warning or an error,
 *  - or an array of TypedMessage's.
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

import '../../common/js/trace.js';

import { Base } from '../../common/classes/base.class.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js';

import { ICheckable } from '../../common/interfaces/icheckable.iface.js';
import { IMessager } from '../../common/interfaces/imessager.iface.js';
import { IStatusable } from '../../common/interfaces/istatusable.iface.js';

import { Panel } from './panel.class.js';

import { ICheckerEvents } from '../interfaces/ichecker-events.iface.js';
import { ICheckerHierarchy } from '../interfaces/ichecker-hierarchy.iface.js';
import { ICheckerStatus } from '../interfaces/ichecker-status.iface.js';
import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';

export class Checker extends mix( Base ).with( ICheckerEvents, ICheckerHierarchy, ICheckerStatus, ICheckable, IStatusable ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #args = null;

    // configuration
    #defaultConf = {
        parent: null,
        messager: null,
        panel: null,
        data: null,
        id: null,
        displayFieldTypeIndicator: null,
        checkStatusShow: null,
        validityEvent: 'checker-validity.forms',
        parentClass: 'form-indicators-parent',
        rightSiblingClass: 'form-indicators-right-sibling'
   };
    #conf = {};

    // runtime data

    // the topmost node of the template as a jQuery object
    #$topmost = null;

    // private methods

    // clear the IMessager if any
    _messagerClear(){
        _trace( 'Checker._messagerClear' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerClear();
        }
    }

    // dump the IMessager
    _messagerDump(){
        _trace( 'Checker._messagerDump' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        }
    }

    // push a TypedMessage
    _messagerPush( tms, id ){
        _trace( 'Checker._messagerPush', tms, id );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerPush( tms, id );
        }
    }

    // remove all messages emitted by this Checker and its fields
    //  and recurse on the children
    _messagerRemove(){
        _trace( 'Checker._messagerRemove' );
        // cleanup the messages stack from this checker
        let checkables = [];
        const cb = function( name, spec ){
            checkables.push( spec.iCheckableId());
            return true;
        };
        this.fieldsIterate( cb );
        checkables.push( this.iCheckableId());
        this.hierarchyUp( '_messagerRemoveById', checkables );
        // iterate on all children
        this.rtChildren().forEach(( child ) => {
            child._messagerRemove();
        });
    }

    // remove the messages send from this checker
    // - checkables is an identifier or an array of identifiers
    _messagerRemoveById( checkables ){
        _trace( 'Checker._messagerRemoveById', checkables );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerRemove( checkables );
        }
    }

    // protected methods

    // returns the Blaze.TemplateInstance defined at instanciation time
    argInstance(){
        const instance = this.#instance || null;
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    // returns the data to be passed to field-defined check functions, may be null
    confData(){
        return this.#conf.data || null;
    }

    // whether a field type indicator must be displayed for the fields of this checker
    //  defaulting to the configured value
    confDisplayFieldTypeIndicator(){
        let display = this.#conf.displayFieldTypeIndicator;
        if( display !== true && display !== false ){
            display = Forms._conf.displayFieldTypeIndicator;
        }
        if( display !== true && display !== false ){
            display = true; // hard-coded default value in case configure() has been wrongly fed
        }
        return display;
    }

    // whether and how display a status indicator (none or bootstrap or indicator)
    //  considers the configured default value and whether it is overridable
    //  considers the Checker configuration
    //  this may be overriden on a per-field basis
    confDisplayStatus(){
        let display = Forms._conf.checkStatusShow;
        const overridable = Forms._conf.checkStatusOverridable;
        if( overridable ){
            const opt = this.#conf.checkStatusShow;
            if( opt !== null ){
                display = opt;
            }
        }
        return display;
    }

    // returns the id row identifier, may be null
    confId(){
        const id = this.#conf.id || null;
        assert( id === null || ( id && _.isString( id )), 'id is expected to be a non-empty string' );
        return id;
    }

    // returns the IMessager interface, may be null
    confIMessager(){
        const messager = this.#conf.messager || null;
        assert( !messager || messager instanceof IMessager, 'messager is expected to be a IMessager instance' );
        return messager;
    }

    // returns the $ok jQuery object or null
    conf$Ok(){
        const $obj = this.#conf.$ok || null;
        assert( !$obj || ( $obj instanceof jQuery && $obj.length ), '$ok is expected to be a jQuery object' );
        return $obj;
    }

    // returns the okFn function or null
    confOkFn(){
        const fn = this.#conf.okFn || null;
        assert( !fn || _.isFunction( fn ), 'okFn is expected to be a function' );
        return fn;
    }

    // returns the Panel fields definition, may be null
    confPanel(){
        const panel = this.#conf.panel || null;
        assert( !panel || panel instanceof Panel, 'panel is expected to be a Panel instance' );
        return panel;
    }

    // returns the parent Checker if any, may be null
    confParent(){
        const parent = this.#conf.parent || null;
        assert( !parent || parent instanceof Checker, 'parent is expected to be a Checker instance' );
        return parent;
    }

    // returns the class to be set on the parent dynamically inserted before each field
    confParentClass(){
        const name = this.#conf.parentClass || null;
        assert( !name || _.isString( name ), 'parentClass is expected to be a non empty string' );
        return name;
    }

    // returns the class to be set on the right sibling node dynamically inserted just after each field
    confRightSiblingClass(){
        const name = this.#conf.rightSiblingClass || null;
        assert( !name || _.isString( name ), 'rightSiblingClass is expected to be a non empty string' );
        return name;
    }

    // returns the validity event, always set
    confValidityEvent(){
        const event = this.#conf.validityEvent || null;
        assert( !event || _.isString( event ), 'validityEvent is expected to be a non empty string' );
        return event;
    }

    // returns the topmost node of the template as a jQuery object - always set
    // automaticaly computed the first time we need it
    rtTopmost(){
        if( !this.#$topmost ){
            const instance = this.argInstance();
            this.#$topmost = instance.$( instance.firstNode );
        }
        const $elt = this.#$topmost;
        assert( $elt && $elt instanceof jQuery && $elt.length, '$topmost node is expected to be non-null jQuery object' );
        return $elt;
    }

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new Checker instance
     * @param {Blaze.TemplateInstance} instance the (mandatory) bound Blaze template instance
     *  - let us defines autorun() functions
     *  - provides a '$' jQuery operator which is tied to this template instance
     *  - provides the DOM element which will act as a global event receiver
     *  - provides the topmost DOM element to let us find all managed fields
     * @param {Object} args an optional arguments object with following keys:
     *  - parent: an optional parent Checker instance
     *  - messager: an optional IMessager implementation
     *    > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *    > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - panel: an optional Panel instance which defines the managed fields
     *  - data: an optional data opaque object to be passed to check functions as additional argument
     *  - id: when the panel is array-ed, the row identifier
     *    will be passed as an option to field-defined check function
     *  - $ok: an optional jQuery object which defines the OK button (to enable/disable it)
     *  - okFn( valid<Boolean> ): an optional function to be called when OK button must be enabled/disabled
     *  - displayFieldTypeIndicator: whether to display a field type indicator on the left of each field,
     *    this value overrides the configured default value
     *    it only applies if the field is itself qualified with a 'type' in the Forms.FieldType set
     *  - checkStatusShow: whether and how to display the result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *
     *  - validityEvent: if set, the event used to advertize of each Checker validity status, defaulting to 'checker-validity'
     *  - parentClass: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'
     *  - rightSiblingClass: if set, the class to be set on the DIV inserted just after each field, defaulting to 'form-indicators-right-sibling'
     * @returns {Checker} this Checker instance
     */
    constructor( instance, args={} ){
        _trace( 'Checker.Checker' );
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is mandatory, must be a Blaze.TemplateInstance instance');
        assert( !args || _.isObject( args ), 'when set, options must be a plain javascript Object' );
        if( args ){
            assert( !args.parent || args.parent instanceof Checker, 'when set, parent must be a Checker instance' );
            assert( !args.messager || args.messager instanceof IMessager, 'when set, messager must be a IMessager instance' );
            assert( !args.panel || args.panel instanceof Panel, 'when set, panel must be a Panel instance' );
            assert( !args.id || _.isString( args.id ), 'when set, id must be a non-empty string' );
            assert( !args.$ok || ( args.$ok instanceof jQuery && args.$ok.length ), 'when set, $ok must be a jQuery object' );
            assert( !args.okFn || _.isFunction( args.okFn ), 'when set, okFn must be a function' );
            assert( !args.validityEvent || _.isString( args.validityEvent ), 'when set, validityEvent must be a non-empty string' );
            assert( !args.parentClass || _.isString( args.parentClass ), 'when set, parentClass must be a non-empty string' );
        }

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#instance = instance;
        this.#args = args;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );

        // if we want some debug display that before logs of interfaces initializations
        //console.debug( this, this.confId());

        // initialize panel-level runtime data
        // have to wait for having returned from super() and have built the configuration
        this.eventInstallInputHandler();
        this.eventInstallValidityHandler();
        this.hierarchyRegister();
        this.statusInstallOkAutorun();
        this.statusInstallStatusAutorun();
        this.statusInstallValidityAutorun();

        // initialize field-level data
        const cb = function( name, spec ){
            spec.iFieldRunInit( this );
            return true;
        }
        this.fieldsIterate( cb );

        // onDestroyed
        if( false ){
            const confId = this.confId();
            this.argInstance().view.onViewDestroyed( function(){
                console.debug( 'onViewDestroyed', confId );
            });
        }

        // run an initial check with default values (but do not update the provided data if any)
        this.check({ update: false });

        return this;
    }

    /**
     * @summary Check a panel, and all rows of an array-ed panel, and update its status
     * @param {Object} opts an option object with following keys:
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *  - id: the identifier of the checker or null, added by IFieldRun.iFieldRunCheck() function
     *  - ignoreFields: whether fields must be considered when consolidating the status, defaulting to false
     *    use case: when the checker actually manages an external component and the defined fields have to be ignored
     * @returns {Promise} which eventually resolves to the global validity status of the form as true|false
     */
    async check( opts={} ){
        _trace( 'Checker.check' );
        let valid = true;
        let promises = [];
        const cb = function( name, spec ){
            promises.push( spec.iFieldRunCheck( opts ).then(( v ) => {
                valid &&= v;
                return valid;
            }));
            return true;
        };
        this.fieldsIterate( cb );
        return Promise.allSettled( promises )
            .then(() => {
                //if( opts.display === false ){
                //    self.clear();
                //}
                //self.#conf.entityChecker && console.debug( self.#conf.entityChecker );
                return valid;
            });
    }

    /**
     * @summary Clears the validity indicators
     */
    clear(){
        _trace( 'Checker.clear' );
        console.warn( 'clear() is obsoleted, please use messagerClear()' );
        this.messagerClear();
    }

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    errorSet( tm ){
        // in our model, only fields have TypedMessage's
        console.warn( 'errorSet() is obsoleted, please use messagerPush()' );
        this.messagerPush( tm );
    }

    /**
     * @summary Iterate on each field specification, calling the provided 'cb' callback for each one
     *  the recursive iteration stops as soon as the 'cb' doesn't return true
     *  in other words, iterate while 'cb' returns true (same than 'every' instruction)
     * @param {Function} cb callback
     *  cb( fieldName<String>, fieldSpec<IFieldSpec>, args<Any>) : Boolean
     *  NB: inside of the 'cb' callback, 'this' is this Checker instance
     * @param {Any} args to be passed to the callback
     */
    fieldsIterate( cb, args=null ){
        _trace( 'Checker.fieldsIterate' );
        const self = this;
        const _iterate = function( name, spec, arg ){
            check( spec, IFieldSpec );
            return cb.bind( self )( name, spec, arg );
        };
        const panel = this.confPanel();
        if( panel ){
            panel.iEnumerateKeys( _iterate, args );
        }
    }

    /**
     * @returns {Object} with data from the form
     *  Note: doesn't work well in an array-ed panel
     */
    getForm(){
        const self = this;
        let res = {};
        /*
        const cb = function( name, spec ){
            const eltData = self.iCkDomDataset( spec );
            res[name] = self._valueFrom( eltData );
            return true;
        };
        this.fieldsIterate( cb );
        Object.keys( self.#fields ).every(( f ) => {
            o[f] = self.#instance.$( self.#fields[f].js ).val();
            return true;
        });
        */
        return res;
    }

    /**
     * @summary Clears the messages stack
     */
    messagerClear(){
        _trace( 'Checker.messagerClear' );
        this.hierarchyUp( '_messagerClear' );
    }

    /**
     * @summary Dump the Messager content in the display order
     */
    messagerDump(){
        _trace( 'Checker.messagerDump' );
        this.hierarchyUp( '_messagerDump' );
    }

    /**
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the emitter ICheckable identifier
     */
    messagerPush( tms, id=null ){
        _trace( 'Checker.messagerPush' );
        this.hierarchyUp( '_messagerPush', tms, id );
    }

    /**
     * @summary Remove the messages published by these ICheckable's
     * @param {String|Array<String>} ids
     */
    messagerRemove( ids ){
        _trace( 'Checker.messagerRemove' );
        this.hierarchyUp( '_messagerRemoveById', ids );
    }

    /**
     * @summary initialize the form with the given data
     * @param {Object} item
     * @param {Object} opts an option object with following keys:
     *  $parent: when set, the DOM parent of the targeted form - in case of an array-ed form
     * @returns {FormChecker} this instance
     */
    /*
    setForm( item, opts={} ){
        const self = this;
        console.warn( 'setForm' );
        const cb = function( name, field ){
            const js = field.iSpecSelector();
            if( js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( js );
                } else {
                    const instance = self.argInstance();
                    if( instance ){
                        $js = instance.$( js );
                    }
                }
                if( $js && $js.length === 1 ){
                    eltData = $js.data( 'form-checker' );
                    if( !eltData ){
                        this._domDataSet( $js, field );
                        eltData = $js.data( 'form-checker' );
                    }
                    if( eltData ){
                        self._valueTo( eltData, item );
                    } else {
                        Meteor.isDevelopment && console.warn( name, field, 'eltData not set' );
                    }
                }
            }
            return true;
        };
        this.fieldsIterate( cb );
        return this;
    }
    */

    /**
     * @summary Remove this Checker from the hierarchy tree
     *  In an array-ed form, removing a row implies to also cleanup the associated Checker
     *  - remove the messages published from this Checker and its dependants
     *  - remove all this subtree from the hierarchy tree
     */
    removeMe(){
        _trace( 'Checker.removeMe' );
        // cleanup the messages stack from this checker
        this._messagerRemove();
        // detach from the hierarchy tree
        const parent = this.confParent();
        if( parent ){
            //console.debug( 'siblings before', this.confParent().rtChildren().length );
            this.hierarchyRemove( parent );
            //console.debug( 'siblings after', this.confParent().rtChildren().length );
            this.statusConsolidate( parent );
        }
    }

    /**
     * @summary Set the validity from an external emitter
     *  As a side effect, the status is reset to NONE for this Checker
     *  Example of a use case: the form embeds an external component not managed by any Checker
     * @param {Boolean} valid
     */
    setValid( valid ){
        _trace( 'Checker.setValid' );
        this.iStatusableStatus( CheckStatus.C.NONE );
        this.iStatusableValidity( valid );
        this.statusConsolidate({ ignoreFields: true });
    }

    /**
     * @returns {CheckStatus} the current (consolidated) check status of this panel
     */
    status(){
        _trace( 'Checker.status' );
        return this.iStatusableStatus();
    }

    /**
     * @returns {Boolean} the current (consolidated) true|false validity of this panel
     */
    validity(){
        _trace( 'Checker.validity' );
        return this.iStatusableValidity();
    }
}
