/*
 * pwix:forms/src/client/interfaces/ifield-run.iface.js
 *
 * IFieldRun is the interface to let an application's panel manage the field at runtime.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Blaze } from 'meteor/blaze';
import { Logger } from 'meteor/pwix:logger';
import { UIUtils } from 'meteor/pwix:ui-utils';

import '../../common/js/index.js';

import '../components/FormsStatusIndicator/FormsStatusIndicator.js';
import '../components/FormsTypeIndicator/FormsTypeIndicator.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';
import { FieldType } from '../../common/definitions/field-type.def.js'

import { Checker } from '../classes/checker.class.js';

const logger = Logger.get();

export const IFieldRun = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // the attached Checker
    #checker = null;

    // dynamically rendered Blaze views
    #views = [];

    // private methods

    // consolidate the result of the defined check function
    //  checkRes: the result of the checkFn function, is null, or a TypedMessage, or an array of TypedMessage's
    //  cf. Checker.check for a description of known options
    _checkAfter( opts, value, checkRes ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkAfter()', opts, value, checkRes );
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
        // consolidate the status at the Checker level
        checker.statusConsolidate( opts );
        // run onUpdate() hooks
        checker.onUpdate( opts );
    }

    // some initializations and clearings before any check of the field
    _checkBefore( opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkBefore()', opts );
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkConsolidate()', value, res );
        let valid = true;
        let status = FieldStatus.C.NONE;
        if( res ){
            const o = this.iStatusableConsolidate( res );
            status = o.status;
            valid = o.valid;
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
    async _initPrefixType( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initPrefixType()', checker );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const display = this.iRunShowType();
        const type = this.iSpecType();
        const $node = this.iRunUINode();
        if( display === true && type && FieldType.known( type ) && $node ){
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
     * @returns {Node} the DIV when actually present in the DOM, or null
     */
    async _initRightSibling( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initRightSibling()', checker );
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
                res = await UIUtils.DOM.waitFor( waitedSelector );
            }
        } else {
            if( !siblingClass ){
                logger.warn( 'IFieldRun.initRightSibling() no sibling class' );
            }
            if( !$node ){
                logger.warn( 'IFieldRun.initRightSibling() unable to get UI node for', this.name());
            }
        }
        return res;
    }

    /*
     * @summary Add a FieldStatus indicator after the field if it is defined
     * @param {Checker} checker
     */
    async _initSuffixStatus( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initSuffixStatus()', checker );
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
                this.#views.push( Blaze.renderWithData( Template.FormsStatusIndicator, data, $parentNode[0], $sibling[0] ));
            }
        }
    }

    /*
     * @summary Insert a parent in the DOM to prepare future potential indicators insertion
     * @param {Checker} checker
     * @returns {Node} the parent when actually present in the DOM, or null
     */
    async _initWrapParent( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initWrapParent()', checker );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        const parentClass = checker.confParentClass();
        const $node = this.iRunUINode();
        let res = null;
        if( parentClass && $node ){
            const $parent = $node.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                //logger.debug( 'IFieldRun.initWrapParent', this.name());
                $node.wrap( '<div class="'+parentClass+'"></div>' );
                const waitedSelector = '.'+parentClass+' '+this.iSpecSelector();
                res = await UIUtils.DOM.waitFor( waitedSelector );
            }
        }
        return res;
    }

    /**
     * @returns {IFieldRun} the instance
     */
    constructor( name, args ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.IFieldRun()' );
        super( ...arguments );
        return this;
    }

    /**
     * @locus Anywhere
     * @summary Check the field
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check() for a description of the known options
     * @returns {Promise} which resolve to the true|false validity status for this field
     */
    async iFieldRunCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunCheck()', this.name(), opts );
        let res = true;
        const checker = this.iRunChecker();
        return Promise.resolve( res ).then(() => {
            if( checker.enabled()){
                // some initializations and clearings before any check of this field
                opts.checker = checker;
                this._checkBefore( opts );
                // if a check function has been defined, calls it (warning once if not exists)
                const checkFn = this.iSpecCheck();
                if( checkFn ){
                    opts.id = checker.confId();
                    const value = this.iRunValueFrom();
                    const self = this;
                    return( checkFn( value, checker.confData(), opts )
                        .then( async ( fnres ) => {
                            return self._checkAfter( opts, value, fnres );
                        })
                        .then( async () => {
                            return self.iCheckableResult() || ( opts.crossCheck === false ? null : await checker.crossCheck( opts ));
                        })
                        .then(() => {
                            return self.iStatusableValidity();
                        }));
                }
            } else {
                return res;
            }
        });
    }

    /**
     * @summary Initialize the runtime data at Checker instanciation
     * @param {Checker} checker
     */
    async iFieldRunInit( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunInit()', checker );
        assert( checker && checker instanceof Checker, 'expects an instance of Checker, got '+checker );
        this.iRunChecker( checker );
        let promises = [];
        const self = this;
        await this._initWrapParent( checker );
        if( self.iRunShowType() === true ){
            await this._initPrefixType( checker );
        }
        if( self.iRunShowStatus() !== Forms.C.ShowStatus.NONE ){
            await this._initRightSibling( checker );
            await this._initSuffixStatus( checker );
        }
    }

    /**
     * @summary Input handler
     *  - check the field (if the checker is enabled)
     */
    async iFieldRunInputHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunInputHandler()' );
        await this.iFieldRunCheck();
    }

    // getter/setter
    // Getter is called from iFieldRunInit() at Checker instanciation time
    // the attached checker
    iRunChecker( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunChecker()', checker );
        if( checker !== undefined ){
            assert( checker && checker instanceof Checker, 'checker must be an instance of Checker' );
            this.#checker = checker;
        }
        const o = this.#checker;
        assert( o && o instanceof Checker, 'checker must be an instance of Checker' );
        return o;
    }

    /**
     * @param {String} attrs
     * @returns {jQuery} the jQuery object which represent the INPUT/SELECT node in the Checker
     *  This is expected to be the exact DOM node where get or set the value
     *  May return null if the node is not yet in the DOM
     *  NB: do not cache the result to handle dynamic UIs
     */
    iRunInputNode( attrs='' ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunInputNode()', attrs );
        const inputTags = [ 'INPUT', 'SELECT', 'TEXTAREA' ];
        const checker = this.iRunChecker();
        const instance = checker.argInstance();
        const selector = this.iSpecSelector();
        let $node = instance.$( selector+attrs );
        if( $node.length ){
            let tagName = $node.prop( 'tagName' );
            if( !inputTags.includes( tagName ) && !$node[0].isContentEditable ){
                $node = instance.$( selector+' :input'+attrs );
            }
        }
        return $node.length ? $node : null;
    }

    /**
     * @returns {FieldStatus} the way the status should be displayed for this field
     *  - confDisplayStatus() returns the way of the package is configured, maybe overriden at the checker level
     *  - if the package allows overridable, then consider the field defintion if it is valid
     *  NB: do not cache the result to handle dynamic UIs
     */
    iRunShowStatus(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunShowStatus()' );
        let display = this.iRunChecker().confDisplayStatus();
        const overridable = Forms.configure().showStatusOverridable;
        if( overridable ){
            const status = this.iSpecStatus();
            if( status ){
                display = status;
            }
        }
        return display;
    }

    /**
     * @returns {Boolean} whether a type should be displayed for this field
     *  considering the package configuration, and the Checker instanciation options
     *  NB: do not cache the result to handle dynamic UIs
     */
    iRunShowType(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunShowType()' );
        let display = this.iRunChecker().confDisplayType();
        const overridable = Forms.configure().showTypeOverridable;
        if( overridable ){
            const status = this.iSpecType();
            if( status && FieldType.known( status )){
                display = ( status !== FieldType.C.NONE );
            }
        }
        return display;
    }

    /**
     * @returns {jQuery} the jQuery object which represent the UI node in the Checker
     *  May return null if the node doesn't yet exist in the DOM
     */
    iRunUINode(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunUINode()' );
        const checker = this.iRunChecker();
        const instance = checker.argInstance();
        const selector = this.iSpecSelector();
        const $node = instance.$( selector );
        return $node.length ? $node : null;
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunValueFrom()' );
        let $node = this.iRunInputNode();
        //if( this.name() === 'effectEnd' ) logger.debug( this, $node );
        let value = null;
        if( $node && $node.length ){
            const defn = this._defn();
            //if( this.name() === 'effectEnd' ) logger.debug( this.name(), 'defn:', defn );
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
                //if( this.name() === 'effectEnd' ) logger.debug( this.name(), 'value', value, 'tagName', tagName, 'eltType', eltType, 'isContentEditable', $node[0].isContentEditable );
                if( tagName === 'INPUT' && eltType === 'checkbox' ){
                    value = $node.prop( 'checked' );
                } else if( tagName === 'INPUT' && eltType === 'radio' ){
                    $node = this.iRunInputNode( ':checked' );
                    value = $node.val();
                } else if( tagName === 'DIV' && $node[0].isContentEditable ){
                    value = $node.text();
                    //if( this.name() === 'effectEnd' ) logger.debug( this.name(), value );
                }
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
        //if( this.name() === 'effectEnd' ) logger.debug( 'returning', value );
        return value;
    }

    /**
     * @summary Set the value into the form
     * @param {Object} item the object data source
     * @param {Object} opts an optional options object, with following keys:
     *  - value: the value to be considered, defaulting to those returned by iSpecValueFrom()
     */
    iRunValueTo( item, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunValueTo()', item, opts );
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
