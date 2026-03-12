/*
 * pwix:forms/src/client/interfaces/ichecker-hierarchy.iface.js
 *
 * ICheckerHierarchy let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import { Checker } from '../classes/checker.class';

const logger = Logger.get();

export const ICheckerHierarchy = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the children Checker's
    #children = [];

    // private methods

    /*
     * @summary Register a new child Checker
     * @param {Checker} child
     */
    _registerChild( child ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy._registerChild()', child );
        assert( child && child instanceof Checker, 'expects an instance of Checker, got '+child );
        this.#children.push( child );
    }

    /*
     * @summary Unregister against the parent (if any)
     */
    _removeChild( child ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy._removeChild()', child );
        assert( child && child instanceof Checker, 'expects an instance of Checker, got '+child );
        const removedRowId = child.confRowId();
        const children = this.rtChildren();
        let found = -1;
        for( let i=0 ; i<children.length ; ++i ){
            if( children[i].confRowId() === removedRowId ){
                found = i;
                break;
            }
        }
        if( found >= 0 ){
            children.splice( found, 1 );
        } else {
            logger.warn( 'ICheckerHierarchy._removeChild() id not found', removedId );
        }
    }

    // find the topmost Checker parent
    _topmostParent(){
        const parent = this.confParent();
        return parent ? parent._topmostParent() : this;
    }

    /**
     * @constructor
     * @param {Blaze.TemplateInstance} instance the bound Blaze template instance
     * @returns {ICheckerHierarchy} the instance
     */
    constructor( instance ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy.ICheckerHierarchy()' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Register against the parent (if any)
     */
    hierarchyRegister(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy.hierarchyRegister()' );
        const parent = this.confParent();
        if( parent ){
            parent._registerChild( this );
        }
    }

    /**
     * @summary Remove the Checker from the hierarchy tree
     * @param {Checker} parent
     */
    hierarchyRemove( parent ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy.hierarchyRemove()', parent );
        assert( parent && parent instanceof Checker, 'expects an instance of Checker, got '+parent );
        parent._removeChild( this );
    }

    /**
     * @summary Apply a function to this checker, and up to the parents hierarchy
     * @param {String} fn function name
     * @param {Any} args to pass to the function
     */
    hierarchyUp( fn ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy.hierarchyUp()' );
        if( this.enabled()){
            let args = [ ...arguments ];
            args.shift();
            //if( fn === '_onUpdate' ) logger.debug( 'hierarchyUp()', this.iSeq(), args );
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
            logger.warn( 'ICheckerHierarchy.hierarchyUp() stopping the up propagation on disabled', this.confName());
        }
    }

    /**
     * @returns <Array> of Checker's children, maybe empty
     */
    rtChildren(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerHierarchy.rtChildren()' );
        return this.#children;
    }
});
