/*
 * pwix:forms/src/client/interfaces/ifield-run.iface.js
 *
 * IFieldRun is the interface to let an application's manage the field at runtime.
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

    // the parent Checker
    #checker = null;

    // dynamically rendered Blaze views
    #views = [];

    // private methods

    // consolidate the result of the defined check function
    //  checkRes: the result of the checkFn function, is null, or a TypedMessage, or an array of TypedMessage's
    //  cf. Checker.check for a description of known options
    async _checkAfter( checker, opts, value, checkRes ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkAfter()', this.name(), opts, value, checkRes );
        // compute a single validity and status for the field from the received result
        this._checkComputeFieldState( value, checkRes );
        // set the status indicator in the UI
        const display = this.iRunShowStatus();
        if( display === Forms.C.ShowStatus.BOOTSTRAP ){
            const $node = this.iRunUINode();
            if( $node ){
                $node.addClass( this.iCheckableValidity() ? 'is-valid' : 'is-invalid' );
            }
        }
        // propagate all returned TypedMessage's up to first available messager the hierarchy (stopping if a checker is not enabled)
        await checker.messagerPush( checkRes, this.iCheckableId());
        // consolidate status and validity at the Checker level
        await checker.intConsolidateState( opts );
    }

    // some initializations and clearings before any check of the field
    async _checkBefore( checker, opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkBefore()', this.name(), opts );
        // do not reset anything reactive to not flicker the display
        //  but still remove bootstrap classes (as no reactivity is based on that)
        const $node = this.iRunUINode();
        if( $node ){
            $node.removeClass( 'is-valid is-invalid' );
        }
        // clear the last messages we have emitted previously
        // and the messages sent by checker and up
        await checker.intMessagerRemoveByIds([ this.iCheckableId() ]);
        await checker.intCheckersClear();
        //await checker.intMessagerDump();
    }

    /*
     * @summary Compute one validity boolean flag and one status value for this field from the Array<TypedMessage>'s result
     *  Do not display any status if the field is empty and asked for
     */
    _checkComputeFieldState( value, res ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._checkComputeFieldState()', this.name(), value, res );
        // first store the result for this field and get the normalized result
        let { status, valid } = this.iCheckableComputeState( res, { updateState: false })
        // if no err has been reported, may want show a status depending of the type of the field
        if( !res && value ){
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
        // honors none-if-empty field status if the field is valid
        if( valid && !value && this.iSpecStatus() === Forms.C.ShowStatus.TRANSPARENT_IF_EMPTY ){
            status = FieldStatus.C.TRANSPARENT;
        }
        // same if the field is optional, and empty, and checked as valid
        if( Forms.configure().withTransparentIndicatorWhenOptionalEmptyValid && valid && !value && this.iSpecType() === FieldType.C.OPTIONAL ){
            status = FieldStatus.C.TRANSPARENT;
        }
        // do not change the field status if it has been defined as transparent
        if( this.iSpecStatus() !== Forms.C.ShowStatus.TRANSPARENT ){
            this.iCheckableStatus( status );
        }
        this.iCheckableValidity( valid );
    }

    /*
     * @summary Add a fieldtype indicator before the field if it is defined
     */
    async _initPrefixType(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initPrefixType()', this.name());
        const display = this.iRunShowType();
        const type = this.iSpecType();
        const $node = this.iRunUINode();
        if( display === true && type && FieldType.known( type ) && $node ){
            const data = {
                type: type
            };
            const parentNode = $node.closest( '.'+this.iRunChecker().confParentClass())[0];
            this.#views.push( Blaze.renderWithData( Template.FormsTypeIndicator, data, parentNode, $node[0] ));
        }
    }

    /*
     * @summary Insert an empty DIV in the DOM to prepare future potential status indicator insertion
     * @returns {Node} the DIV when actually present in the DOM, or null
     */
    async _initRightSibling(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initRightSibling()', this.name());
        const siblingClass = this.iRunChecker().confRightSiblingClass();
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
     */
    async _initSuffixStatus(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initSuffixStatus()', this.name());
        const display = this.iRunShowStatus();
        const checker = this.iRunChecker();
        assert( checker && checker instanceof Forms.Checker, 'expects an instance of Forms.Checker, got'+checker );
        if( display === Forms.C.ShowStatus.INDICATOR || display === Forms.C.ShowStatus.TRANSPARENT || display === Forms.C.ShowStatus.TRANSPARENT_IF_EMPTY ){
            const $node = this.iRunUINode();
            if( $node ){
                const $parentNode = $node.closest( '.'+checker.confParentClass());
                assert( $parentNode && $parentNode.length, 'unexpected parent not found' );
                const siblingClass = checker.confRightSiblingClass();
                const $sibling = $parentNode.find( '.'+siblingClass );
                assert( $sibling && $sibling.length, 'unexpected sibling not found' );
                const data = {
                    statusRv: this.iCheckableStatusRv()
                };
                this.#views.push( Blaze.renderWithData( Template.FormsStatusIndicator, data, $parentNode[0], $sibling[0] ));
            }
        }
    }

    /*
     * @summary Insert a parent in the DOM to prepare future potential indicators insertion
     * @param {Object} opts an optional options object with following keys:
     *  - trace: whether to verbosely trace, defaulting to false
     * @returns {Node} the parent when actually present in the DOM, or null
     */
    async _initWrapParent( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun._initWrapParent()', this.name(), opts );
        if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), 'entering with', opts );

        const parentClass = this.iRunChecker().confParentClass();
        if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), 'parentClass', parentClass );

        const $node = this.iRunUINode();
        if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), '$node', $node );

        let res = null;
        if( parentClass && $node ){
            const $parent = $node.parent();
            if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), '$parent', $parent );
            assert( $parent && $parent.length, 'unexpected parent not found' );

            if( !$parent.hasClass( parentClass )){
                //logger.debug( 'IFieldRun.initWrapParent', this.name());
                $node.wrap( '<div class="'+parentClass+'"></div>' );
                // if the 'js' selector from the field definition contains several words, then the parent has been wrapped just around the last one
                // so the waited element must be searched for before this last class
                const selectors = this.iSpecUISelector().split( /\s+/ );
                selectors.slice( selectors.length-1, 0, '.'+parentClass );
                const waitedSelector = selectors.join( ' ' );
                if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), 'waitedSelector', waitedSelector );

                res = await UIUtils.DOM.waitFor( waitedSelector );
                if( opts.trace ) logger.debug( '_initWrapParent()', this.name(), 'wait res', res );
            }
        }
        return res;
    }

    /**
     * @constructor
     * @returns {IFieldRun} the instance
     */
    constructor( args ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.IFieldRun()', args );
        super( ...arguments );
        return this;
    }

    /**
     * @locus Anywhere
     * @summary Check the field - and that's all
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check() for a description of the known options
     * @returns {Boolean} the true|false validity status for this field
     */
    async iFieldRunCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunCheck()', this.name(), opts );
        let valid = true;
        const checker = this.iRunChecker();
        assert( checker && checker instanceof Forms.Checker, 'expects an instance of Forms.Checker, got '+checker );
        if( checker.enabled()){
            // some initializations and clearings before any check of this field
            opts.checker = checker;
            await this._checkBefore( checker, opts );
            // if a check function has been defined, calls it (warning once if not exists)
            const checkFn = this.iSpecCheck();
            if( checkFn ){
                opts.rowId = checker.confRowId();
                const value = this.iRunValueFrom();
                const res = await checkFn( value, checker.confData(), opts );
                await this._checkAfter( checker, opts, value, res );
            }
            // run onUpdate() hooks
            if( opts.update !== false ){
                await checker.intOnUpdate( this, opts );
            }
            valid = this.iCheckableValidity();
        }
        return valid;
    }

    /**
     * @summary Initialize the runtime data at Checker instanciation
     * @param {Checker} checker
     * @param {Object} opts an optional options object with following keys:
     *  - trace: whether to verbosely trace, defaulting to false
     */
    async iFieldRunInit( checker, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunInit()', this.name(), checker );
        assert( checker && checker instanceof Forms.Checker, 'expects an instance of Forms.Checker, got '+checker );
        if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), 'entering with', checker, opts );

        this.iRunChecker( checker );
        if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), 'checker set' );

        await this._initWrapParent( opts );
        if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), '_initWrapParent() done' );

        if( this.iRunShowType() === true ){
            await this._initPrefixType();
            if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), '_initPrefixType() done' );
        } else {
            if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), '_initPrefixType() not executed as iRunShowType is', this.iRunShowType());
        }

        if( this.iRunShowStatus() !== Forms.C.ShowStatus.NONE ){
            await this._initRightSibling();
            if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), 'iRunShowStatus() done' );

            await this._initSuffixStatus();
            if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), '_initSuffixStatus() done' );
        } else {
            if( opts.trace ) logger.debug( 'iFieldRunInit()', this.name(), '_initSuffixStatus() not executed as iRunShowStatus is', this.iRunShowStatus());
        }
    }

    /**
     * @summary Input handler
     *  - check the field (if the checker is enabled)
     */
    async iFieldRunInputHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iFieldRunInputHandler()', this.name());
        //logger.debug( 'iFieldRunInputHandler()', this.name());
        await this.iFieldRunCheck();
    }

    /**
     * @param {String} attrs
     * @returns {jQuery} the jQuery object which represent the INPUT/SELECT node in the Checker
     *  This is expected to be the exact DOM node where get or set the value
     *  May return null if the node is not yet in the DOM
     *  NB: do not cache the result to handle dynamic UIs
     */
    iRunInputNode( attrs='' ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunInputNode()', this.name(), attrs );
        const inputTags = [ 'INPUT', 'SELECT', 'TEXTAREA' ];
        const instance = this.iRunChecker().intInstance();
        const selector = this.iSpecDOMSelector();
        // iSpecUISelector() targets the UI node while we want here the exact DOM node where get/set the value
        // we are almost sure this is a child of UI node
        let $node = instance.$( selector+attrs );
        //if( this.name() === 'token_endpoint_auth_method' ) logger.debug( selector+attrs, $node, $node.length ? ( 'editable: '+$node[0].isContentEditable ) : 'no-node' );
        if( $node.length ){
            let tagName = $node.prop( 'tagName' );
            if( !inputTags.includes( tagName ) && !$node[0].isContentEditable ){
                $node = instance.$( selector+' :input'+attrs );
                //logger.debug( selector+' :input'+attrs, $node, 'editable', $node[0].isContentEditable );
            }
        }
        return $node.length ? $node : null;
    }

    // Getter/Setter
    // Getter is called from iFieldRunInit() at FormField initialization time
    // the attached checker
    iRunChecker( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunChecker()', this.name(), checker );
        if( checker !== undefined ){
            assert( checker && checker instanceof Forms.Checker, 'expects an instance of Forms.Checker' );
            this.#checker = checker;
        }
        const o = this.#checker;
        assert( o && o instanceof Forms.Checker, 'expects an instance of Forms.Checker' );
        return o;
    }

    /**
     * @returns {FieldStatus} the way the status should be displayed for this field
     *  - confDisplayStatus() returns the way of the package is configured, maybe overriden at the checker level
     *  - if the package allows overridable, then consider the field defintion if it is valid
     *  NB: do not cache the result to handle dynamic UIs
     */
    iRunShowStatus(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunShowStatus()', this.name());
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunShowType()', this.name());
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunUINode()', this.name());
        const instance = this.iRunChecker().intInstance();
        const selector = this.iSpecUISelector();
        const $node = instance.$( selector );
        return $node.length ? $node : null;
    }

    /* Maintainer note:
     *  iRunValueFrom() (resp. iRunValueTo()) get (resp. set) the value from (resp. to) the form
     *  see iSpecValueFrom() to get the value from the item
     * 
     *  formFrom(), formTo() functions can be defined at the checker level
     *  form_formFrom(), form_formTo() functions can be defined at the fieldset level (though not suggested as they are rather form specifics)
     */

    /**
     * @summary Get the value from the form
     * @returns {String|Boolean} the value for this field
     */
    iRunValueFrom(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunValueFrom()', this.name());
        let $node = this.iRunInputNode();
        if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), $node );
        let value = null;
        if( $node && $node.length ){
            const defn = this._defn();
            if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), defn );
            if( defn.formFrom ){
                assert( typeof defn.formFrom === 'function', 'expect formFrom() be a function, found '+defn.formFrom );
                value = defn.formFrom( $node );
            } else if( defn.form_formFrom ){
                assert( typeof defn.form_formFrom === 'function', 'expect form_formFrom() be a function, found '+defn.form_formFrom );
                value = defn.form_formFrom( $node );
            } else {
                value = $node.val();
                // attributes are initial markup, properties are live runtime data
                if( this.iSpecTrace()) logger.debug( this.name(), 'jquery value', value, 'attr value', $node[0].getAttribute( 'value' ), 'prop value', $node[0].value, 'prop checked', $node[0].checked );
                const tagName = $node.prop( 'tagName' );
                const eltType = $node.attr( 'type' );
                if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), 'value', value, 'tagName', tagName, 'eltType', eltType, 'isContentEditable', $node[0].isContentEditable );
                if( tagName === 'INPUT' && eltType === 'checkbox' ){
                    value = $node.prop( 'checked' );

                // the specified selector addresses a radio element, but we don't know if it addresses just one radio (and so each radio item should be specified too) or several items - test both
                } else if( tagName === 'INPUT' && eltType === 'radio' ){
                    $node = this.iRunInputNode( ':checked' );
                    if( $node && $node.length ){
                        value = $node.val();
                        if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), $node, ':checked', value );
                    } else {
                        $node = this.iRunInputNode( ' :checked' );
                        if( $node && $node.length ){
                            value = $node.val();
                            if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), $node, ' :checked', value );
                        }
                    }
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
        if( this.iSpecTrace()) logger.debug( 'iRunValueFrom()', this.name(), 'eventually returning', value );
        return value;
    }

    /**
     * @summary Set the value into the form
     * @param {Object} item the object data source
     * @param {Object} opts an optional options object, with following keys:
     *  - value: the value to be considered, defaulting to those returned by iSpecValueFrom()
     */
    iRunValueTo( item, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldRun.iRunValueTo()', this.name(), item, opts );
        if( this.iSpecTrace()) logger.debug( 'iRunValueTo()', this.name(), item, opts );
        const defn = this._defn();
        const $node = this.iRunInputNode();
        if( this.iSpecTrace()) logger.debug( 'iRunValueTo()', this.name(), $node );
        if( $node ){
            if( defn.formTo ){
                assert( typeof defn.formTo === 'function', 'expect formTo() be a function, found '+defn.formTo );
                if( this.iSpecTrace()) logger.debug( 'iRunValueTo()', this.name(), 'calling defn.formTo()');
                defn.formTo( $node, item );
            } else if( defn.form_formTo ){
                assert( typeof defn.form_formTo === 'function', 'expect form_formTo() be a function, found '+defn.form_formTo );
                if( this.iSpecTrace()) logger.debug( 'iRunValueTo()', this.name(), 'calling defn.form_formTo()');
                defn.form_formTo( $node, item );
            } else {
                const value = Object.keys( opts ).includes( 'value' ) ? opts.value : this.iSpecValueFrom( item );
                if( this.iSpecTrace()) logger.debug( 'iRunValueTo()', this.name(), value );
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
