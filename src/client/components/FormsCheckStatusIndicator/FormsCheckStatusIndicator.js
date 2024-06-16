/*
 * pwix:forms/src/client/components/FormsCheckStatusIndicator/FormsCheckStatusIndicator.js
 *
 * A small icon indicator to exhibit the result of the check of the field.
 *
 * Note: FontAwesome displays its icons by replacing the <span>...</span> element by a svg. As a consequence, the icon cannot be dynamically replaced.
 *  We have to write all icon elements into the DOM, only making visible the one we are interested in.
 *
 * Parms:
 *  - type: a CheckResult constant which may be 'NONE', 'INVALID', 'UNCOMPLETE' or 'VALID'
 *  - classes: if set, a list of classes to be added to the default
 *  - title: if set, a text to replace the default title
 */

import { CheckStatus } from '../../common/definitions/check-status.def.js';

import './FormsCheckStatusIndicator.html';
import './FormsCheckStatusIndicator.less';

Template.FormsCheckStatusIndicator.onRendered( function(){
    const self = this;

    self.autorun(() => {
        self.$( '.field-check-indicator .fcsi-display' ).removeClass( 'visible' ).addClass( 'hidden' );
        self.$( '.field-check-indicator .fcsi-display[data-type="'+Template.currentData().type+'"]' ).removeClass( 'hidden' ).addClass( 'visible' );
    });
});

Template.FormsCheckStatusIndicator.helpers({
    // a class which encapsulates the icon
    //  determines the color through the stylesheet
    itClass( it ){
        return CheckResult.classes( it );
    },

    // the name of the icon
    itIcon( it ){
        return CheckResult.icon( it );
    },

    // a class which encapsulates the icon
    //  determines the color through the stylesheet
    itTitle( it ){
        return this.title ? this.title : CheckResult.title( it );
    },

    // list of known types
    itemsList(){
        return CheckResult.Knowns();
    }
});
