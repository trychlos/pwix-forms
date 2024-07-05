/*
 * pwix:forms/src/common/interfaces/ifield-run.iface.js
 *
 * IFieldRun is the interface to let an application's panel manage the field at runtime.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { TM } from 'meteor/pwix:typed-message';
import { UIU } from 'meteor/pwix:ui-utils';

import '../../common/js/index.js';

import '../components/FormsCheckStatusIndicator/FormsCheckStatusIndicator.js';
import '../components/FormsFieldTypeIndicator/FormsFieldTypeIndicator.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js';
import { FieldType } from '../../common/definitions/field-type.def.js'

import { Checker } from '../classes/checker.class.js';

export const IFieldRun = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // the attached Checker
    #checker = null;

    // the DOM node
    #jqNode = null;

    // whether and how display the status of the field
    #showStatus = null;

    // dynamically rendered Blaze views
    #views = [];

    // private methods

    // consolidate the result of the defined check function
    //  res: is null, or a TypedMessage, or an array of TypedMessage's
    //  cf. Checker.check for a description of known options
    _checkAfter( opts, res ){
        _trace( 'IFieldRun._checkAfter' );
        res = this.iCheckableResult( res );
        // consolidate each received TypedMessage into a single validity and status for the field
        this._checkTMConsolidate();
        // set the status indicator
        const display = this.iRunShowStatus();
        if( display === Forms.C.CheckStatus.BOOTSTRAP ){
            const $node = this.iRunNode();
            if( $node ){
                $node.addClass( this.iStatusableValidity() ? 'is-valid' : 'is-invalid' );
            }
        }
        // consolidate at the Checker level
        const checker = this.iRunChecker();
        checker.statusConsolidate( opts );
        // and push all returned TypedMessage's
        checker.messagerPush( res, this.iCheckableId());
    }

    // some initializations and clearings before any check of the field
    _checkBefore( opts ){
        _trace( 'IFieldRun._checkBefore' );
        // do not reset anything reactive to not flicker the display
        //  but still remove bootstrap classes (as no reactivity is based on that)
        const $node = this.iRunNode();
        if( $node ){
            $node.removeClass( 'is-valid is-invalid' );
        }
        // clear the last messages we have emitted
        this.iRunChecker().messagerRemove([ this.iCheckableId() ]);
    }

    // consolidate several validity/status from besides fields

    /*
     * @summary Consolidate the validity and the status of the field from the Array<TypedMessage> result
     */
    _checkTMConsolidate(){
        _trace( 'IFieldRun._checkConsolidate' );
        let valid = true;
        let status = CheckStatus.C.NONE;
        const result = this.iCheckableResult();
        if( result ){
            let statuses = [ CheckStatus.C.VALID ];
            result.forEach(( tm ) => {
                let tmValid = true;
                if( tm instanceof TM.TypedMessage ){
                    const level = tm.iTypedMessageLevel();
                    tmValid = ( TM.LevelOrder.compare( level, TM.MessageLevel.C.ERROR ) < 0 );
                    valid &&= tmValid;
                } else {
                    console.warn( 'expected ITypedMessage, got', tm );
                }
                // compute the status
                if( !tmValid ){
                    statuses.push( CheckStatus.C.INVALID );
                } else if( level === TM.MessageLevel.C.WARNING ){
                    statuses.push( CheckStatus.C.UNCOMPLETE );
                }
            });
            status = CheckStatus.worst( statuses );
        // if no err has been reported, may want show a status depending of the type of the field
        } else {
            const type = this.iSpecType();
            switch( type ){
                case FieldType.C.INFO:
                    status = CheckStatus.C.NONE;
                    break;
                default:
                    status = CheckStatus.C.VALID;
                    break
            }
        }
        this.iStatusableStatus( status );
        this.iStatusableValidity( valid );
    }

    /*
     * @summary Add a fieldtype indicator before the field if it is defined
     * @param {Checker} checker
     */
    _initPrefixType( checker ){
        _trace( 'IFieldRun._initPrefixType' );
        check( checker, Checker );
        const display = checker.confDisplayFieldTypeIndicator();
        const type = this.iSpecType();
        const $node = this.iRunNode();
        if( display && type && FieldType.known( type ) && $node ){
            const data = {
                type: type
            };
            const parentNode = $node.closest( '.'+checker.confParentClass())[0];
            this.#views.push( Blaze.renderWithData( Template.FormsFieldTypeIndicator, data, parentNode, $node[0] ));
        }
    }

    /*
     * @summary Insert an empty DIV in the DOM to prepare future potential status indicator insertion
     * @param {Checker} checker
     * @returns {Promise} which will resolve when the DIV is actually present in the DOM, or null
     */
    _initRightSibling( checker ){
        _trace( 'IFieldRun._initRightSibling' );
        check( checker, Checker );
        const siblingClass = checker.confRightSiblingClass();
        const $node = this.iRunNode();
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
     * @summary Add a CheckStatus indicator after the field if it is defined
     * @param {Checker} checker
     */
    _initSuffixStatus( checker ){
        _trace( 'IFieldRun._initSuffixStatus' );
        check( checker, Checker );
        const display = this.iRunShowStatus();
        if( display === Forms.C.CheckStatus.INDICATOR ){
            const $node = this.iRunNode();
            if( $node ){
                const $parentNode = $node.closest( '.'+checker.confParentClass());
                assert( $parentNode && $parentNode.length, 'unexpected parent not found' );
                const siblingClass = checker.confRightSiblingClass();
                const $sibling = $parentNode.find( '.'+siblingClass );
                assert( $sibling && $sibling.length, 'unexpected sibling not found' );
                const data = {
                    statusRv: this.iStatusableStatusRv()
                };
                this.#views.push( Blaze.renderWithData( Template.FormsCheckStatusIndicator, data, $parentNode[0], $sibling[0] ));
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
        check( checker, Checker );
        const parentClass = checker.confParentClass();
        const $node = this.iRunNode();
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
        check( checker, Checker );
        this.iRunChecker( checker );
        let promises = [];
        promises.push( this._initWrapParent( checker ));
        promises.push( this._initRightSibling( checker ));
        const self = this;
        Promise.allSettled( promises ).then(() => {
            self._initPrefixType( checker );
            self._initSuffixStatus( checker )
        });
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
        // some initializations and clearings before any check of this field
        this._checkBefore( opts );
        // if a check function has been defined, calls it (warning once if not exists)
        const checkFn = this.iSpecCheck();
        if( checkFn ){
            const checker = this.iRunChecker();
            opts.id = checker.confId();
            const self = this;
            res = checkFn( this.iRunValueFrom(), checker.confData(), opts ).then( async ( res ) => {
                self._checkAfter( opts, res );
                return self.iStatusableValidity();
            });
        }
        return res;
    }

    /**
     * @summary Input handler
     *  - check the field
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
     * @returns {jQuery} the jQuery object which represent this node in the Checker
     *  This is a just-in-time computation
     *  May return null if the node is not yet in the DOM
     */
    iRunNode(){
        _trace( 'IFieldRun.iRunNode' );
        if( !this.#jqNode ){
            const checker = this.iRunChecker();
            const instance = checker.argInstance();
            const selector = this.iSpecSelector();
            const $node = instance.$( selector );
            if( $node && $node instanceof jQuery && $node.length ){
                this.#jqNode = $node;
            }
        }
        return this.#jqNode;
    }

    /**
     * @returns {CheckStatus} the way the status should be displayed for this field
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
                if( status === true || status === false ){
                    display = status;
                }
            }
            this.#showStatus = display;
        }
        return this.#showStatus;
    }

    /* Maintainer note:
     *  iRunValueFrom() (resp. iRunValueTo()) get (resp. set) the value from (resp. to) the form
     *  see iSpecValueTo() (resp. iSpecValueFrom()) to set (resp. get) the value into (resp. from) the item
     */

    /**
     * @summary Get the value from the form
     * @returns {String|Boolean} the value for this field
     */
    iRunValueFrom(){
        _trace( 'IFieldRun.iRunValueFrom' );
        const defn = this._defn();
        const $node = this.iRunNode();
        let value = null;
        if( $node ){
            if( defn.formFrom ){
                assert( typeof defn.formFrom === 'function', 'expect formFrom() be a function, found '+defn.formFrom );
                value = defn.formFrom( $node );
            } else {
                value = $node.val();
                const tagName = $node.prop( 'tagName' );
                const eltType = $node.attr( 'type' );
                if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
                    value = $node.prop( 'checked' );
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
        return value;
    }

    /**
     * @summary Set the value into the form
     * @param {Object} item the object data source
     * @param {Object} opts an optional options object
     */
    iRunValueTo( item, opts ){
        _trace( 'IFieldRun.iRunValueTo' );
        const defn = this._defn();
        const $node = this.iRunNode();
        if( $node ){
            if( defn.formTo ){
                assert( typeof defn.formTo === 'function', 'expect formTo() be a function, found '+defn.formTo );
                defn.formTo( $node, item );
            } else {
                const value = this.iSpecValueFrom( item );
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
