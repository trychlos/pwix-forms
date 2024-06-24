/*
 * pwix:forms/src/common/interfaces/ichecker-hierarchy.iface.js
 *
 * ICheckerHierarchy let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';

import '../../common/js/index.js';

import { Checker } from '../classes/checker.class';

export const ICheckerHierarchy = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the children Checker's
    #children = [];

    // private methods

    // find the topmost Checker parent
    _topmostParent(){
        const parent = this.confParent();
        return parent ? parent._topmostParent() : this;
    }

    /**
     * @returns {ICheckerHierarchy} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckerHierarchy.ICheckerHierarchy' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Register against the parent (if any)
     */
    hierarchyRegister(){
        _trace( 'ICheckerHierarchy.hierarchyRegisterParent' );
        const parent = this.confParent();
        if( parent ){
            parent.hierarchyRegisterChild( this );
        }
    }

    /**
     * @summary Register a new child Checker
     * @param {Checker} child
     */
    hierarchyRegisterChild( child ){
        _trace( 'ICheckerHierarchy.hierarchyRegisterChild', child );
        check( child, Checker );
        this.#children.push( child );
    }

    /**
     * @summary Remove the Checker from the hierarchy tree
     * @param {Checker} parent
     */
    hierarchyRemove( parent ){
        _trace( 'ICheckerHierarchy.hierarchyRemove' );
        check( parent, Checker );
        parent.hierarchyRemoveChild( this );
    }

    /**
     * @summary Unregister against the parent (if any)
     */
    hierarchyRemoveChild( child ){
        _trace( 'ICheckerHierarchy.hierarchyRemoveChild' );
        check( child, Checker );
        const removedId = child.confId();
        const children = this.rtChildren();
        let found = -1;
        for( let i=0 ; i<children.length ; ++i ){
            if( children[i].confId() === removedId ){
                found = i;
                break;
            }
        }
        if( found >= 0 ){
            children.splice( found, 1 );
        } else {
            console.warn( 'hierarchyRemoveChild: id not found', removedId );
        }
    }

    /**
     * @summary Apply a function to all children of the parent, and up
     * @param {String} fn function name
     */
    hierarchyUp( fn ){
        _trace( 'ICheckerHierarchy.hierarchyUp', );
        // ask the parent to apply the function to all its children
        const parent = this.confParent();
        let args = [ ...arguments ];
        args.shift();
        if( parent ){
            const children = parent.rtChildren();
            if( children && children.length ){
                children.forEach(( child ) => {
                    if( child[fn] ){
                        child[fn]( ...args );
                    } else {
                        console.warn( 'unable to call fn on the child', fn );
                    }
                });
            }
            // last move up to the next parent
            parent.hierarchyUp( ...arguments );
        } else if( this[fn] ){
            this[fn]( ...args );
        } else {
            console.warn( 'unable to call fn on the topmost parent', fn );
        }
    }

    /**
     * @returns <Array> of Checker's children, maybe empty
     */
    rtChildren(){
        _trace( 'ICheckerHierarchy.rtChildren' );
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
