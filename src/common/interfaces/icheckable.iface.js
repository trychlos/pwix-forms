/*
 * pwix:forms/src/common/interfaces/icheckable.iface.js
 *
 * ICheckable if something which can be checked, either a field or a form.
 * The result of this check is either null, or an array of TypedMessage's
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

export const ICheckable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the last check result of the field
    #tm = new ReactiveVar( null );

    // arguments at instanciation time

    /**
     * @returns {ICheckable} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    // getter/setter
    // the last check result of the field
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
            this.#tm.set( result );
        }
        return this.#tm.get();
    }
});
