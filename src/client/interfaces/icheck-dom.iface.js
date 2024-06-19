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
    #initDone = false;

    // a DOM observer
    #observer = null;

    // private methods

    // a DOM observer
    // it reacts to every add/remove node in the global DOM tree
    //  and we do not have any way to say if the add (resp. removed) node is inside of our our template DOM tree :(
    // is it really useful
    _domObserver( mutationList, observer ){
        /*
        if( this.#initDone ){
            for( const mutation of mutationList ){
                if( mutation.type === "childList" && mutation.addedNodes.length ){
                }
            }
        }
            */
    }

    // install a DOM Observer to be able to react to DOM changes
    // https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    _initObserver(){
        _trace( 'ICheckDom._initObserver' );
        const node = this.argInstance().firstNode;
        const config = { childList: true, subtree: true };
        this.#observer = new MutationObserver( this._domObserver );
        this.#observer.observe( node, config );
    }

    // find and keep the topmost element
    _initTopmost(){
        _trace( 'ICheckDom._initTopmost' );
        const instance = this.argInstance();
        const $topmost = instance.$( instance.firstNode );
        this._setTopmost( $topmost );
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
        this._initTopmost();
        this._initObserver();
    }

    /**
     * @summary Advertize of the end of initialization
     */
    iCkDomInitDone(){
        _trace( 'ICheckDom.iCkDomInitDone' );
        this.#initDone = true;
    }

    /**
     * @summary Per field initialization
     */
    iCkDomInitField( name, spec ){
        _trace( 'ICheckDom.iCkDomInitField', name );
    }
});
