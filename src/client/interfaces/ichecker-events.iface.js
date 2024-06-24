/*
 * pwix:forms/src/common/interfaces/ichecker-events.iface.js
 *
 * ICheckerEvents let us manage the events from and to a Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import '../../common/js/index.js';

export const ICheckerEvents = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // returns the FormField relative to the element which is the source of this event, or null
    _fieldSpecFromEvent( event ){
        _trace( 'ICheckerEvents._fieldSpecFromEvent' );
        let found = null;
        const cb = function( name, spec ){
            const selector = spec.iSpecSelector();
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
        _trace( 'ICheckerEvents._inputHandler', event );
        const spec = this._fieldSpecFromEvent( event );
        if( spec ){
            spec.iFieldRunInputHandler();
        } else {
            //console.debug( 'not handled here' );
        }
    }

    // validity handler
    _validityHandler( event ){
        _trace( 'ICheckerEvents._validityHandler' );
        console.debug( 'validityHandler', event );
    }

    /**
     * @returns {ICheckerEvents} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckerEvents.ICheckerEvents' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Install an input handler on the topmost node (if any)
     */
    eventInstallInputHandler(){
        _trace( 'ICheckerEvents.eventInstallInputHandler' );
        const $node = this.rtTopmost();
        const self = this;
        $node.on( 'input', ( event ) => { self._inputHandler( event ); });
    }

    /**
     * àsummary Install the validity handler on the topmost node (if any)
     */
    eventInstallValidityHandler(){
        _trace( 'ICheckerEvents.eventInstallValidityHandler' );
        const $node = this.rtTopmost();
        const self = this;
        const validityEvent = self.confValidityEvent();
        $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
    }
});
