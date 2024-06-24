/*
 * pwix:forms/src/common/interfaces/icheckable.iface.js
 *
 * ICheckable if something which can be checked, either a field or a form.
 * The result of this check is either null, or a TypedMessage, or an array of TypedMessage's.
 *
 * Both FormField (an instance of the field in a form) and Checker (a form) implement ICheckable.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Random } from 'meteor/random';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

export const ICheckable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // an internal identifier so that the IMessager is able to identify this ICheckable
    #id = null;

    // the last check result of the field (or the checker)
    #tm = new ReactiveVar( null );

    // arguments at instanciation time

    /**
     * @returns {ICheckable} the instance
     */
    constructor(){
        _trace( 'ICheckable.ICheckable' );
        super( ...arguments );
        this.#id = Random.id();
        return this;
    }

    // getter
    iCheckableId(){
        _trace( 'ICheckable.iCheckableId' );
        return this.#id;
    }

    // getter/setter
    // the last check result of the field or the Checker
    iCheckableResult( result ){
        _trace( 'ICheckable.iCheckableResult' );
        if( result !== undefined ){
            if( result ){
                if( result instanceof TM.TypedMessage ){
                    result = [ result ];
                } else if( !( result instanceof Array )){
                    assert( result === null || result instanceof Array, 'expects result be null or an Array of TypedMessage\'s' );
                }
            }
            //console.debug( 'result', result );
            this.#tm.set( result );
        }
        return this.#tm.get();
    }
});
