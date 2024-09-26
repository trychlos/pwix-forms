/*
 * pwix:forms/src/client/interfaces/ifield-run.iface.js
 *
 * IFieldRun is the interface to let an application's panel manage the field at runtime.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Blaze } from 'meteor/blaze';
import { TM } from 'meteor/pwix:typed-message';
import { UIU } from 'meteor/pwix:ui-utils';

import '../../common/js/index.js';

import '../components/FormsStatusIndicator/FormsStatusIndicator.js';
import '../components/FormsTypeIndicator/FormsTypeIndicator.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';
import { FieldType } from '../../common/definitions/field-type.def.js'

import { Checker } from '../classes/checker.class.js';

export const IFieldRun = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // the attached Checker
    #checker = null;

    // the UI DOM node addressed by the 'js' parameter
    #uiNode = null;

    // the INPUT DOM node
    #inputNode = null;

    // whether and how display the status of the field
    #showStatus = null;

    // dynamically rendered Blaze views
    #views = [];

    // private methods

    // consolidate the result of the defined check function
    //  checkRes: the result of the checkFn function, is null, or a TypedMessage, or an array of TypedMessage's
    //  cf. Checker.check for a description of known options
    _checkAfter( opts, value, checkRes ){
        _trace( 'IFieldRun._checkAfter' );
        checkRes = this.iCheckableResult( checkRes );
        // consolidate received TypedMessage's into a single validity and status for the field
        this._checkTMConsolidate( value, checkRes );
        // set the status indicator
        const display = this.iRunShowStatus();
        if( display === Forms.C.ShowStatus.BOOTSTRAP ){
            const $node = this.iRunUINode();
            if( $node ){
                $node.addClass( this.iStatusableValidity() ? 'is-valid' : 'is-invalid' );
            }
        }
        // push all returned TypedMessage's up to the hierarchy - stopping if a checker is not enabled
        const checker = this.iRunChecker();
        checker.messagerPush( checkRes, this.iCheckableId());
        // and consolidate the status at the Checker level
        checker.statusConsolidate( opts );
    }

    // some initializations and clearings before any check of the field
    _checkBefore( opts ){
        _trace( 'IFieldRun._checkBefore' );
        // do not reset anything reactive to not flicker the display
        //  but still remove bootstrap classes (as no reactivity is based on that)
        const $node = this.iRunUINode();
        if( $node ){
            $node.removeClass( 'is-valid is-invalid' );
        }
        // clear the last messages we have emitted
        this.iRunChecker().messagerRemove([ this.iCheckableId() ]);
    }

    /*
     * @summary Compute one validity boolean flag and one status value for this field from the Array<TypedMessage>'s result
     *  Do not display any status if the field is empty
     */
    _checkTMConsolidate( value, res ){
        _trace( 'IFieldRun._checkConsolidate' );
        let valid = true;
        let status = FieldStatus.C.NONE;
        if( res ){
            let statuses = [ FieldStatus.C.VALID ];
            let level;
            res.forEach(( tm ) => {
                let tmValid = true;
                if( tm instanceof TM.TypedMessage ){
                    level = tm.iTypedMessageLevel();
                    // cf. man syslog 3: the higher the level, the lower the severity
                    tmValid = ( TM.LevelOrder.compare( level, TM.MessageLevel.C.ERROR ) > 0 );
                    valid &&= tmValid;
                } else {
                    console.warn( 'expected ITypedMessage, got', tm );
                }
                // compute the status
                if( !tmValid ){
                    statuses.push( FieldStatus.C.INVALID );
                } else if( level === TM.MessageLevel.C.WARNING ){
                    statuses.push( FieldStatus.C.UNCOMPLETE );
                }
            });
            status = FieldStatus.worst( statuses );
        // if no err has been reported, may want show a status depending of the type of the field
        } else if( value ){
            const type = this.iSpecType();
            switch( type ){
                case FieldType.C.INFO:
                    status = FieldStatus.C.NONE;
                    break;
                default:
                    status = FieldStatus.C.VALID;
                    break
            }
        }
        //console.debug( '_checkTMConsolidate', this.name(), value, res, status, valid );
        // do not change the field status if it has been defined as transparent
        if( this.iSpecStatus() !== Forms.C.ShowStatus.TRANSPARENT ){
            this.iStatusableStatus( status );
        }
        this.iStatusableValidity( valid );
    }

    /*
     * @summary Add a fieldtype indicator before the field if it is defined
     * @param {Checker} checker
     */
    _initPrefixType( checker ){
        _trace( 'IFieldRun._initPrefixType' );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const display = checker.confDisplayFieldTypeIndicator();
        const type = this.iSpecType();
        const $node = this.iRunUINode();
        if( display && type && FieldType.known( type ) && $node ){
            const data = {
                type: type
            };
            const parentNode = $node.closest( '.'+checker.confParentClass())[0];
            this.#views.push( Blaze.renderWithData( Template.FormsTypeIndicator, data, parentNode, $node[0] ));
        }
    }

    /*
     * @summary Insert an empty DIV in the DOM to prepare future potential status indicator insertion
     * @param {Checker} checker
     * @returns {Promise} which will resolve when the DIV is actually present in the DOM, or null
     */
    _initRightSibling( checker ){
        _trace( 'IFieldRun._initRightSibling' );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const siblingClass = checker.confRightSiblingClass();
        const $node = this.iRunUINode();
        let res = null;
        if( siblingClass && $node ){
            const $parent = $node.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            const waitedSelector = '.'+siblingClass;
            const $siblings = $parent.find( waitedSelector );
            if( !$siblings.length ){
                $node.after( '<div class="'+siblingClass+'"></div>' );
                res = UIU.DOM.waitFor( waitedSelector ).then(() => {
                    //console.debug( 'got waitedSelector', waitedSelector );
                });
            }
        }
        return res;
    }

    /*
     * @summary Add a FieldStatus indicator after the field if it is defined
     * @param {Checker} checker
     */
    _initSuffixStatus( checker ){
        _trace( 'IFieldRun._initSuffixStatus' );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const display = this.iRunShowStatus();
        if( display === Forms.C.ShowStatus.INDICATOR || display === Forms.C.ShowStatus.TRANSPARENT ){
            const $node = this.iRunUINode();
            if( $node ){
                const $parentNode = $node.closest( '.'+checker.confParentClass());
                assert( $parentNode && $parentNode.length, 'unexpected parent not found' );
                const siblingClass = checker.confRightSiblingClass();
                const $sibling = $parentNode.find( '.'+siblingClass );
                assert( $sibling && $sibling.length, 'unexpected sibling not found' );
                const data = {
                    statusRv: this.iStatusableStatusRv()
                };
                //console.debug( this.name(), this.iStatusableStatus());
                this.#views.push( Blaze.renderWithData( Template.FormsStatusIndicator, data, $parentNode[0], $sibling[0] ));
            }
        }
    }

    /*
     * @summary Insert a parent in the DOM to prepare future potential indicator insertions
     * @param {Checker} checker
     * @returns {Promise} which will resolve when the parent is actually present in the DOM, or null
     */
    _initWrapParent( checker ){
        _trace( 'IFieldRun._initWrapParent' );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const parentClass = checker.confParentClass();
        const $node = this.iRunUINode();
        let res = null;
        if( parentClass && $node ){
            const $parent = $node.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                $node.wrap( '<div class="'+parentClass+'"></div>' );
                const waitedSelector = '.'+parentClass+' '+this.iSpecSelector();
                res = UIU.DOM.waitFor( waitedSelector ).then(() => {
                    //console.debug( 'got waitedSelector', waitedSelector );
                });
            }
        }
        return res;
    }

    /**
     * @returns {IFieldRun} the instance
     */
    constructor( name, args ){
        _trace( 'IFieldRun.IFieldRun' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Initialize the runtime data at Checker instanciation
     * @param {Checker} checker
     */
    iFieldRunInit( checker ){
        _trace( 'IFieldRun.iFieldRunInit' );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        this.iRunChecker( checker );
        if( checker.confDisplayStatus() !== Forms.C.ShowStatus.NONE ){
            let promises = [];
            promises.push( this._initWrapParent( checker ));
            promises.push( this._initRightSibling( checker ));
            const self = this;
            Promise.allSettled( promises ).then(() => {
                self._initPrefixType( checker );
                self._initSuffixStatus( checker )
            });
        }
    }

    /**
     * @locus Anywhere
     * @summary Check the field
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Promise} which resolve to the true|false validity status for this field
     */
    async iFieldRunCheck( opts={} ){
        _trace( 'IFieldRun.iFieldRunCheck', this.name());
        let res = true;
        const checker = this.iRunChecker();
        if( checker.enabled()){
            // some initializations and clearings before any check of this field
            this._checkBefore( opts );
            // if a check function has been defined, calls it (warning once if not exists)
            const checkFn = this.iSpecCheck();
            if( checkFn ){
                opts.id = checker.confId();
                const value = this.iRunValueFrom();
                const self = this;
                res = checkFn( value, checker.confData(), opts ).then( async ( fnres ) => {
                    //console.debug( 'fnres', this.name(), fnres );
                    self._checkAfter( opts, value, fnres );
                    return self.iStatusableValidity();
                });
            }
        }
        return res;
    }

    /**
     * @summary Input handler
     *  - check the field (if the checker is enabled)
     */
    iFieldRunInputHandler(){
        _trace( 'IFieldRun.iFieldRunInputHandler' );
        this.iFieldRunCheck();
    }

    // getter/setter
    // the attached checker
    iRunChecker( checker ){
        _trace( 'IFieldRun.iRunChecker' );
        if( checker !== undefined ){
            assert( checker && checker instanceof Checker, 'checker must be an instance of Checker' );
            this.#checker = checker;
        }
        const o = this.#checker;
        assert( o && o instanceof Checker, 'checker must be an instance of Checker' );
        return o;
    }

    /**
     * @returns {jQuery} the jQuery object which represent the INPUT/SELECT node in the Checker
     *  This is a cached computation
     *  May return null if the node is not yet in the DOM
     */
    iRunInputNode(){
        _trace( 'IFieldRun.iRunInputNode' );
        if( !this.#inputNode ){
            const inputTags = [ 'INPUT', 'SELECT', 'TEXTAREA' ];
            const checker = this.iRunChecker();
            const instance = checker.argInstance();
            const selector = this.iSpecSelector();
            let $node = instance.$( selector );
            let tagName = $node.prop( 'tagName' );
            if( !inputTags.includes( tagName )){
                $node = instance.$( selector+' :input' );
                tagName = $node.prop( 'tagName' );
            }
            if( $node && $node instanceof jQuery && $node.length && inputTags.includes( tagName )){
                this.#inputNode = $node;
            }
        }
        //console.debug( this.name(), this.#inputNode );
        return this.#inputNode;
    }

    /**
     * @returns {FieldStatus} the way the status should be displayed for this field
     *  considering the package configuration, and the Checker instanciation options
     */
    iRunShowStatus(){
        _trace( 'IFieldRun.iRunShowStatus' );
        if( !this.#showStatus ){
            let display = this.iRunChecker().confDisplayStatus();
            //console.debug( 'iRunShowStatus checker display', this.name(), display );
            const overridable = Forms.configure().checkStatusOverridable;
            //console.debug( 'iRunShowStatus overridable', this.name(), overridable );
            if( overridable ){
                const status = this.iSpecStatus();
                //console.debug( 'iRunShowStatus spec display', this.name(), status );
                if( status ){
                    display = status;
                }
            }
            this.#showStatus = display;
        }
        return this.#showStatus;
    }

    /**
     * @returns {jQuery} the jQuery object which represent the UI node in the Checker
     *  This is a cached computation
     *  May return null if the node doesn't yet exist in the DOM
     */
    iRunUINode(){
        _trace( 'IFieldRun.iRunUINode' );
        if( !this.#uiNode ){
            const checker = this.iRunChecker();
            const instance = checker.argInstance();
            const selector = this.iSpecSelector();
            const $node = instance.$( selector );
            if( $node && $node instanceof jQuery && $node.length ){
                this.#uiNode = $node;
            }
        }
        return this.#uiNode;
    }

    /* Maintainer note:
     *  iRunValueFrom() (resp. iRunValueTo()) get (resp. set) the value from (resp. to) the form
     *  see iSpecValueFrom() to get the value from the item
     * 
     *  formFrom(), formTo() functions can be defined at the panel level
     *  form_formFrom(), form_formTo() functions can be defined at the fieldset level (though not suggested as they are rather panel specifics)
     */

    /**
     * @summary Get the value from the form
     * @returns {String|Boolean} the value for this field
     */
    iRunValueFrom(){
        _trace( 'IFieldRun.iRunValueFrom' );
        const defn = this._defn();
        const $node = this.iRunInputNode();
        let value = null;
        if( $node ){
            if( defn.formFrom ){
                assert( typeof defn.formFrom === 'function', 'expect formFrom() be a function, found '+defn.formFrom );
                value = defn.formFrom( $node );
            } else if( defn.form_formFrom ){
                assert( typeof defn.form_formFrom === 'function', 'expect form_formFrom() be a function, found '+defn.form_formFrom );
                value = defn.form_formFrom( $node );
            } else {
                value = $node.val();
                const tagName = $node.prop( 'tagName' );
                const eltType = $node.attr( 'type' );
                if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
                    value = $node.prop( 'checked' );
                }
                //console.debug( 'iRunValueFrom', this.name(), value );
                /*
                // a small hack to handle 'true' and 'false' values from coreYesnoSelect
                const $select = $node.closest( '.core-yesno-select' );
                if( $select.length ){
                    if( value === 'true' || value === 'false' ){
                        value = ( value === 'true' );
                    }
                }
                */
            }
        }
        return value;
    }

    /**
     * @summary Set the value into the form
     * @param {Object} item the object data source
     * @param {Object} opts an optional options object, with following keys:
     *  - value: the value to be considered, defaulting to those returned by iSpecValueFrom()
     */
    iRunValueTo( item, opts={} ){
        _trace( 'IFieldRun.iRunValueTo' );
        const defn = this._defn();
        const $node = this.iRunInputNode();
        if( $node ){
            if( defn.formTo ){
                assert( typeof defn.formTo === 'function', 'expect formTo() be a function, found '+defn.formTo );
                defn.formTo( $node, item );
            } else if( defn.form_formTo ){
                assert( typeof defn.form_formTo === 'function', 'expect form_formTo() be a function, found '+defn.form_formTo );
                defn.form_formTo( $node, item );
            } else {
                const value = Object.keys( opts ).includes( 'value' ) ? opts.value : this.iSpecValueFrom( item );
                //console.debug( 'item', item, 'field', this.name(), 'value', value );
                //console.warn( 'iRunValueTo', this.name(), value );
                $node.val( value );
                const tagName = $node.prop( 'tagName' );
                const eltType = $node.attr( 'type' );
                if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
                    $node.prop( 'checked', value == true );
                }
                /*
                const $select = $node.closest( '.core-yesno-select' );
                if( $select.length ){
                    const def = null;//CoreApp.YesNo.byValue( value );
                    if( def ){
                        $node.val( CoreApp.YesNo.id( def ));
                    }
                }
                */
            }
        }
    }
});
