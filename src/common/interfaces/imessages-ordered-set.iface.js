/*
 * /imports/common/interfaces/imessages-ordered-set.iface.js
 *
 * An interface to manage ordered TypedMessage's.
 * The class which implements this interface MUST also implement IMessagesSet.
 * 
 * This interace provides methods as reactive data sources.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { MessageType } from '../definitions/message-type.def.js';
import { TypeOrder } from '../definitions/type-order.def.js';

import { IMessagesSet } from '../interfaces/imessages-set.iface.js';
import { ITypedMessage } from '../interfaces/ityped-message.iface.js';

export const IMessagesOrderedSet = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the last ITypedMessage of any of the given types
    //  manages the synonyms, returnings the most recent of the two synonyms if any
    _lastByType( array ){
        for( let i=this._set.length-1 ; i>=0 ; --i ){
            const o = this._set[i];
            assert( o instanceof ITypedMessage, 'IMessagesOrderedSet expects to find ITypedMessage inside of the messages set' );
            if( array.includes( o.ITypedMessageType())){
                return o;
            }
        }
        return null;
    }

    // scans for ITypedMessage in order of criticity
    _lastOrdered(){
        let found = null;
        TypeOrder.Knowns().every(( type ) => {
            found = this._lastByType( MessageType.synonyms( type ));
            return found === null;
        });
        return found;
    }

    /**
     * @summary Constructor
     * @returns {IMessagesOrderedSet} the instance
     */
    constructor(){
        super( ...arguments );

        assert( this instanceof IMessagesSet, 'the implementation class MUST also implements IMessagesSet' );

        return this;
    }

    /**
     * @returns {ITypedMessage} last message, searched for in decreasing order of TypeOrder
     *  A reactive data source
     */
    IMessagesOrderedSetLast(){
        this._dep.depend();
        //console.debug( 'IMessagesOrderedSetLast()' );
        return this._lastOrdered();
    }
});
