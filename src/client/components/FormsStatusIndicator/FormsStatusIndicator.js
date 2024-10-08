/*
 * pwix:forms/src/client/components/FormsStatusIndicator/FormsStatusIndicator.js
 *
 * A small icon indicator to exhibit the result of the check of the field.
 *
 * Note: FontAwesome displays its icons by replacing the <span>...</span> element by a svg. As a consequence, the icon cannot be dynamically replaced.
 *  We have to write all icon elements into the DOM, only making visible the one we are interested in.
 *
 * Parms:
 *  - statusRv: a ReactiveVar which contains the FieldStatus to be displayed
 *  - classes: if set, a list of classes to be added to the default
 *  - title: if set, a text to replace the default title
 */

const assert = require( 'assert' ).strict; // up to nodejs v16.x

import { ReactiveVar } from 'meteor/reactive-var';

import { FieldStatus } from '../../../common/definitions/field-status.def.js';

import './FormsStatusIndicator.html';
import './FormsStatusIndicator.less';

Template.FormsStatusIndicator.onRendered( function(){
    const self = this;
    //console.debug( this );

    self.autorun(() => {
        self.$( '.FormsStatusIndicator .fcsi-display' ).removeClass( 'visible' ).addClass( 'hidden' );
        const rv = Template.currentData()?.statusRv;
        if( rv ){
            assert( rv instanceof ReactiveVar, 'expects an instance of ReactiveVar, got '+rv );
            self.$( '.FormsStatusIndicator .fcsi-display[data-type="'+rv.get()+'"]' ).removeClass( 'hidden' ).addClass( 'visible' );
        }
    });

    // track status changes
    if( false ){
        self.autorun(() => {
            const status = Template.currentData().statusRv && Template.currentData().statusRv.get();
            console.debug( 'status', status );
        });
    }
});

Template.FormsStatusIndicator.helpers({
    // either the standard 'form-rounder' class, same that other indicators
    //  or a button class if asked for
    formClass( it ){
        if(( it === FieldStatus.C.INVALID && this.invalidButton === true ) ||
            ( it === FieldStatus.C.UNCOMPLETE && this.uncompleteButton === true ) ||
            ( it === FieldStatus.C.VALID && this.validButton === true )){
            return 'btn btn-sm btn-outline-secondary form-button';
        }
        return 'form-rounded';
    },

    // a class which encapsulates the icon
    //  determines the color through the stylesheet
    itClass( it ){
        return FieldStatus.classes( it );
    },

    // the name of the icon
    itIcon( it ){
        return FieldStatus.icon( it );
    },

    // a class which encapsulates the icon
    //  determines the color through the stylesheet
    itTitle( it ){
        return this.title ? this.title : FieldStatus.title( it );
    },

    // list of known types
    itemsList(){
        return FieldStatus.Knowns();
    }
});

Template.FormsStatusIndicator.events({
    'click .fcsi-display.btn'( event, instance ){
        if( this.buttonOnClick && typeof this.buttonOnClick === 'function' ){
            this.buttonOnClick({ type: instance.$( event.currentTarget ).data( 'type' )});
        }
    }
});
