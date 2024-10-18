/*
 * pwix:forms/src/common/definitions/field-type.def.js
 */

import _ from 'lodash';

import { pwixI18n } from 'meteor/pwix:i18n';

export const FieldType = {
    C: {
        INFO:        'INFO',
        MANDATORY:   'MANDATORY',
        NONE:        'NONE',
        OPTIONAL:    'OPTIONAL',
        TRANSPARENT: 'TRANSPARENT',
        WORK:        'WORK'
    }
};
_.merge( FieldType, {
    K: {
        // info only - not modifiable
        INFO: {
            class: 'fti-info',
            icon: 'fa-info',
            title: 'field_type.info_title'
        },
        // mandatory in order the document be saved
        MANDATORY: {
            class: 'fti-mandatory',
            icon: 'fa-asterisk',
            title: 'field_type.save_title'
        },
        // none - the field is not displayed
        NONE: {
            class: 'ui-hidden',
            icon: 'fa-circle'
        },
        // optional value
        OPTIONAL: {
            class: 'fti-optional',
            icon: 'fa-face-grin-beam',
            title: 'field_type.optional_title'
        },
        // transparent - the field uses its place and width, but is not shown
        TRANSPARENT: {
            class: 'ui-transparent',
            icon: 'fa-circle'
        },
        // not mandatory for save, but SHOULD be set to be fully operational
        WORK: {
            class: 'fti-work',
            icon: 'fa-person-digging',
            title: 'field_type.work_title'
        }
    },

    // check that the type is known
    _byType( type ){
        if( !Object.keys( FieldType.K ).includes( type )){
            console.warn( 'FieldType: unknown type', type );
            return null;
        }
        return FieldType.K[type];
    },

    /**
     * @returns {String} the classes associated with this type
     */
    classes( type ){
        const o = FieldType._byType( type );
        return o ? o.class : null;
    },

    /**
     * @returns {String} the name of the icon associated with this type
     */
    icon( type ){
        const o = FieldType._byType( type );
        return o ? o.icon : '';
    },

    /**
     * @returns {Boolean} whether the type is known
     */
    known( type ){
        const o = FieldType._byType( type );
        return ( o !== null );
    },

    /**
     * @returns {String} the title associated with this type
     */
    title( type ){
        const o = FieldType._byType( type );
        return o && o.title ? pwixI18n.label( I18N, o.title ) : '';
    }
});
