/*
 * pwix:forms/src/common/interfaces/icheck-dom.iface.js
 *
 * ICheckDom let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckDom = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // a DOM observer
    #observer = null;

    // private methods

    _domObserver( mutationList, observer ){
        for ( const mutation of mutationList ) {
            if( mutation.type === "childList" ){
                console.log("A child node has been added or removed.", mutation );
            } else {
                console.warn( 'unexpected mutation type', mutation.type );
            }
        }
    }

    // install a DOM Observer to be able to react to DOM changes
    // https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    _initObserver(){
        _trace( 'ICheckDom._initObserver' );
        const node = this._getInstance().firstNode;
        const config = { childList: true, subtree: true };
        this.#observer = new MutationObserver( this._domObserver );
        this.#observer.observe( node, config );
    }

    /**
     * @returns {ICheckDom} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckDom.ICheckDom' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary ICheckDom initialization
     *  - install our dataset on each already defined element
     *  - install a parent element to maybe later host type and status indicators
     *  - install a DOM observer to install a new dataset on new fields
     */
    iCkDomInit(){
        _trace( 'ICheckDom.iCkDomInit' );
        this._initObserver();
    }

    /**
     * @summary Field initialization
     */
    iCkDomInitField( name, spec ){
        _trace( 'ICheckDom.iCkDomInitField', name );
    }
});
