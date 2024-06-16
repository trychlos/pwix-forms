/*
 * pwix:forms/src/common/interfaces/icheck-hierarchy.iface.js
 *
 * ICheckHierarchy let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';

import { Checker } from '../classes/checker.class';

export const ICheckHierarchy = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the children Checker's
    #children = [];

    /**
     * @returns {ICheckHierarchy} the instance
     */
    constructor( name, args ){
        super( ...arguments );
        return this;
    }

    /**
     * @summary Initialization
     *  Register in the hierarchy
     */
    iHierarchyInit(){
        const parent = this._getParent();
        if( parent ){
            parent.iHierarchyRegister( this );
        }
    }

    /**
     * @summary Register a new child Checker
     * @param {Checker} child
     */
    iHierarchyRegister( child ){
        check( child, Checker );
        this.#children.push( child );
    }

    /**
     * @summary Apply a function to this instance, and trigers the parent
     * @param {Function} fn
     */
    iHierarchyUp( fn ){
        let args = [ ...arguments ];
        args.shift();
        this[fn]( ...args );
        const parent = this._getParent();
        if( parent ){
            parent.iHierarchyUp( ...arguments );
        }
    }
});
