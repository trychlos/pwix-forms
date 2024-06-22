/*
 * pwix:forms/src/common/interfaces/icheck-events.iface.js
 *
 * ICheckEvents let us manage the events from and to a Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import '../../common/js/index.js';

export const ICheckEvents = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the FieldSpec relative to the element which is the source of this event, or null
    _fieldSpecFromEvent( event ){
        _trace( 'ICheckEvents._fieldSpecFromEvent' );
        let found = null;
        const cb = function( name, spec ){
            const selector = spec.iFieldSelector();
            if( selector && event.target.matches( selector )){
                found = spec;
            }
            return found === null;
        }
        this.fieldsIterate( cb );
        return found;
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    _inputHandler( event ){
        _trace( 'ICheckEvents._inputHandler', event );
        //console.debug( '_inputHandler', event );
        const spec = this._fieldSpecFromEvent( event );
        if( spec ){
            //this.iCkFieldCheck( field, this.argInstance().$( event.target ));
            spec.checkerInputHandler();
        } else {
            //console.debug( 'not handled here' );
        }
    }

    // validity handler
    _validityHandler( event ){
        _trace( 'ICheckEvents._validityHandler' );
        console.debug( 'validityHandler', event );
    }

    /**
     * @returns {ICheckEvents} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckEvents.ICheckEvents' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Install an input handler on the topmost node (if any)
     */
    eventInstallInputHandler(){
        _trace( 'ICheckEvents.eventInstallInputHandler' );
        const $node = this.rtTopmost();
        const self = this;
        $node.on( 'input', ( event ) => { self._inputHandler( event ); });
    }

    /**
     * àsummary Install the validity handler on the topmost node (if any)
     */
    eventInstallValidityHandler(){
        _trace( 'ICheckEvents.eventInstallValidityHandler' );
        const $node = this.rtTopmost();
        const self = this;
        const validityEvent = self.confValidityEvent();
        $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
    }
});
