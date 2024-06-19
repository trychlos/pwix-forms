/*
 * pwix:forms/src/common/interfaces/icheck-hierarchy.iface.js
 *
 * ICheckHierarchy let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';

import '../../common/js/index.js';

import { Checker } from '../classes/checker.class';

export const ICheckHierarchy = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the children Checker's
    #children = [];

    // private methods

    /**
     * @returns {ICheckHierarchy} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckHierarchy.ICheckHierarchy' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Register a new child Checker
     * @param {Checker} child
     */
    hierarchyRegisterChild( child ){
        _trace( 'ICheckHierarchy.hierarchyRegisterChild', child );
        check( child, Checker );
        this.#children.push( child );
    }

    /**
     * @summary Register against the parent (if any)
     */
    hierarchyRegisterParent(){
        _trace( 'ICheckHierarchy.hierarchyRegisterParent' );
        const parent = this.confParent();
        if( parent ){
            parent.hierarchyRegisterChild( this );
        }
    }

    /**
     * @summary Apply a function to this instance, and trigers the parent
     * @param {String} fn function name
     */
    hierarchyUp( fn ){
        _trace( 'ICheckHierarchy.hierarchyUp', fn );
        // ask the parent to apply the function to all its children
        const parent = this.confParent();
        if( parent ){
            const children = parent.rtChildren();
            if( children ){
                let args = [ ...arguments ];
                args.shift();
                children.forEach(( child ) => {
                    child[fn]( ...args );
                });
            }
            // last move up to the next parent
            parent.hierarchyUp( ...arguments );
        }
    }

    /**
     * @returns <Array> of Checker's children, maybe empty
     */
    rtChildren(){
        _trace( 'ICheckHierarchy.rtChildren' );
        return this.#children;
        let args = [ ...arguments ];
        args.shift();
        this[fn]( ...args );
        const parent = this.confParent();
        if( parent ){
            parent.iCkHierarchyUp( ...arguments );
        }
    }
});
