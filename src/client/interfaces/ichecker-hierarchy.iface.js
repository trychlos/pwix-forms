/*
 * pwix:forms/src/client/interfaces/ichecker-hierarchy.iface.js
 *
 * ICheckerHierarchy let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

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
        assert( child && child instanceof Checker, 'expects an instance of Checker, got '+child );
        this.#children.push( child );
    }

    /**
     * @summary Remove the Checker from the hierarchy tree
     * @param {Checker} parent
     */
    hierarchyRemove( parent ){
        _trace( 'ICheckerHierarchy.hierarchyRemove' );
        assert( parent && parent instanceof Checker, 'expects an instance of Checker, got '+parent );
        parent.hierarchyRemoveChild( this );
    }

    /**
     * @summary Unregister against the parent (if any)
     */
    hierarchyRemoveChild( child ){
        _trace( 'ICheckerHierarchy.hierarchyRemoveChild' );
        assert( child && child instanceof Checker, 'expects an instance of Checker, got '+child );
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
     * @summary Apply a function to this checker, and up to the parents hierarchy
     * @param {String} fn function name
     * @param {Any} args to pass to the function
     */
    hierarchyUp( fn ){
        _trace( 'ICheckerHierarchy.hierarchyUp' );
        if( this.enabled()){
            let args = [ ...arguments ];
            args.shift();
            if( false && fn === '_messagerPush' && args.length ){
                console.debug( 'hierarchyUp', this.iCheckableId(), fn, this.confName(), args );
            }
            // apply the function to this checker
            if( this[fn] ){
                this[fn]( ...args );
            }
            // up to the parent if any
            const parent = this.confParent();
            if( parent ){
                parent.hierarchyUp( ...arguments );
            }
        } else {
            console.warn( 'pwix:forms stopping the up propagation on disabled', this.confName());
        }
    }

    /**
     * @returns <Array> of Checker's children, maybe empty
     */
    rtChildren(){
        _trace( 'ICheckerHierarchy.rtChildren' );
        return this.#children;
    }
});
