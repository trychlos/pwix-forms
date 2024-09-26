/*
 * pwix:forms/src/client/components/FormsTypeIndicator/FormsTypeIndicator.js
 *
 * A small icon indicator to exhibit the type of field.
 *
 * Parms:
 *  - type: a value from FieldType definition which may be 'INFO', 'OPTIONAL', 'MANDATORY' or 'WORK'
 *  - classes: if set, a list of classes to be added to the default
 *  - title: if set, a title to replace the default one
 */

import { FieldType } from '../../../common/definitions/field-type.def.js';

import './FormsTypeIndicator.html';
import './FormsTypeIndicator.less';

Template.FormsTypeIndicator.helpers({
    // a class which encapsulates the icon
    //  determines the color through the stylesheet
    iconClass(){
        return FieldType.classes( this.type );
    },
    // the name of the icon
    iconName(){
        return FieldType.icon( this.type );
    },
    // a title
    title(){
        return FieldType.title( this.type );
    }
});
