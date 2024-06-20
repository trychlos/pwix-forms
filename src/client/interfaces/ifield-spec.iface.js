/*
 * pwix:forms/src/common/interfaces/ifield-spec.iface.js
 *
 * IFieldSpec is the interface to let an application's panel defines a field management.
 *
 * Field specification is provided as a plain javascript object, with following keys:
 *  - js: a CSS selector; it is expected to let us address the field and its content
 *  - valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - type: the mandatory/optional field type
 *  - status: whether the field should be appended with an indicator to show valid|invalid state, defaulting to false
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

export const IFieldSpec = DeclareMixin(( superclass ) => class extends superclass {

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

    // whether we have already warned of the lack of a check function
    #warned = false;

    // private methods

    // consolidate the result of the defined check function
    //  res: is null, or a TypedMessage, or an array of TypedMessage's
    //  cf. Checker.check for a description of known options
    _checkAfter( opts, res ){
        _trace( 'IFieldSpec._checkAfter' );
        res = this.iCheckableResult( res );
        // consolidate each received TypedMessage into a single validity and status for the field
        this._checkTMConsolidate();
        // set the status indicator
        const display = this.rtShowStatus();
        if( display === Forms.C.CheckStatus.BOOTSTRAP ){
            const $node = this.rtNode();
            if( $node ){
                $node.addClass( this.iStatusableValidity() ? 'is-valid' : 'is-invalid' );
            }
        }
        // consolidate at the Checker level
        const checker = this.rtChecker();
        checker.statusConsolidate( opts );
        // and push all returned TypedMessage's
        checker.messagerPush( res, this.iCheckableId());
    }

    // some initializations and clearings before any check of the field
    _checkBefore( opts ){
        _trace( 'IFieldSpec._checkBefore' );
        // do not reset anything reactive to not flicker the display
        // remove bootstrap classes (possible because no reactivity is based on that)
        const $node = this.rtNode();
        if( $node ){
            $node.removeClass( 'is-valid is-invalid' );
        }
        // clear the last messages we have emitted
        this.rtChecker()._messagerRemoveById([ this.iCheckableId() ]);
    }

    // consolidate several validity/status from besides fields

    /*
     * @summary Consolidate the validity and the status of the field from the Array<TypedMessage> result
     */
    _checkTMConsolidate(){
        _trace( 'IFieldSpec._checkConsolidate' );
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
            const type = this.iFieldType();
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
        _trace( 'IFieldSpec._initPrefixType' );
        check( checker, Checker );
        const display = checker.confDisplayFieldTypeIndicator();
        const type = this.iFieldType();
        const $node = this.rtNode();
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
        _trace( 'IFieldSpec._initRightSibling' );
        check( checker, Checker );
        const siblingClass = checker.confRightSiblingClass();
        const $node = this.rtNode();
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
        _trace( 'IFieldSpec._initSuffixStatus' );
        check( checker, Checker );
        const display = this.rtShowStatus();
        if( display === Forms.C.CheckStatus.INDICATOR ){
            const $node = this.rtNode();
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
        _trace( 'IFieldSpec._initWrapParent' );
        check( checker, Checker );
        const parentClass = checker.confParentClass();
        const $node = this.rtNode();
        let res = null;
        if( parentClass && $node ){
            const $parent = $node.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                $node.wrap( '<div class="'+parentClass+'"></div>' );
                const waitedSelector = '.'+parentClass+' '+this.iFieldSelector();
                res = UIU.DOM.waitFor( waitedSelector ).then(() => {
                    //console.debug( 'got waitedSelector', waitedSelector );
                });
            }
        }
        return res;
    }

    /*
     * @summary Get the value from the form
     * @returns {String|Boolean} the value for this field
     */
    _valueFrom(){
        _trace( 'IFieldSpec._valueFrom' );
        const $node = this.rtNode();
        const tagName = $node.prop( 'tagName' );
        const eltType = $node.attr( 'type' );
        let value = null;
        if( $node ){
            if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
                value = $node.prop( 'checked' );
            } else {
                value = $node.val() || '';
                // a small hack to handle 'true' and 'false' values from coreYesnoSelect
                const $select = $node.closest( '.core-yesno-select' );
                if( $select.length ){
                    if( value === 'true' || value === 'false' ){
                        value = ( value === 'true' );
                    }
                }
            }
        }
        return value;
    }

    /**
     * @returns {IFieldSpec} the instance
     */
    constructor( name, args ){
        _trace( 'IFieldSpec.IFieldSpec' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Initialize the runtime data at Checker instanciation
     * @param {Checker} checker
     */
    checkerInit( checker ){
        _trace( 'IFieldSpec.checkerInit' );
        check( checker, Checker );
        this.rtChecker( checker );
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
     * @summary Input handler
     *  - check the field
     */
    checkerInputHandler(){
        _trace( 'IFieldSpec.checkerInputHandler' );
        this.iFieldCheck();
    }

    /**
     * @locus Anywhere
     * @summary Check the field
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Promise} which resolve to the true|false validity status for this field
     */
    async iFieldCheck( opts={} ){
        _trace( 'IFieldSpec.iFieldCheck', this.name());
        let res = true;
        // some initializations and clearings before any check of this field
        this._checkBefore( opts );
        // if a check function has been defined, calls it (warning once if not exists)
        const defn = this._defn();
        if( defn.check && _.isFunction( defn.check )){
            const checker = this.rtChecker();
            opts.id = checker.confId();
            const self = this;
            res = defn.check( this._valueFrom(), checker.confData(), opts ).then( async ( res ) => {
                self._checkAfter( opts, res );
                return self.iStatusableValidity();
            });
        } else if( Meteor.isDevelopment && !this.#warned ){
            console.warn( '[DEV] no check function provided for \''+this.name()+'\'' );
            this.#warned = true;
        }
        return res;
    }

    /**
     * @returns {Boolean} whether this field spec is array-ed
     *  NB: the containing Checker must be instanciated with an 'id()' function when array-ed
     */
    iFieldIsArrayed(){
        _trace( 'IFieldSpec.iFieldIsArrayed' );
        const name = this.name();
        return name.match( /\.\$\./ ) !== null;
    }

    /**
     * @returns {String} the js css selector, or null
     */
    iFieldSelector(){
        _trace( 'IFieldSpec.iFieldSelector' );
        const defn = this._defn();
        return defn.js || null;
    }

    /**
     * @returns {String} whether and how the status should be displayed for this field
     *  No default is provided: without any specification, the checker configuration will apply for all fields
     */
    iFieldStatus(){
        _trace( 'IFieldSpec.iFieldStatus' );
        const defn = this._defn();
        let status = defn.status;
        return status;
    }

    /**
     * @returns {String} the type of the field (mandatory/optional/none), or null
     */
    iFieldType(){
        _trace( 'IFieldSpec.iFieldType' );
        const defn = this._defn();
        return defn.type || null;
    }

    // getter/setter
    // the attached checker
    rtChecker( checker ){
        _trace( 'IFieldSpec.rtChecker' );
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
     *  Note that $node be NOT in the DOM, for example if the caller has defined a FieldSpec, but not implemented it in the DOM
     */
    rtNode(){
        _trace( 'IFieldSpec.rtNode' );
        if( !this.#jqNode ){
            const checker = this.rtChecker();
            const instance = checker.argInstance();
            const selector = this.iFieldSelector();
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
    rtShowStatus(){
        _trace( 'IFieldSpec.rtShowStatus' );
        if( !this.#showStatus ){
            const display = this.rtChecker().confDisplayStatus();
            const overridable = Forms._conf.checkStatusOverridable;
            if( overridable ){
                const status = this.iFieldStatus();
                if( status ){
                    display = status;
                }
            }
            this.#showStatus = display;
        }
        return this.#showStatus;
    }
});
