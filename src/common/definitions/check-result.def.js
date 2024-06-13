/*
 * pwix:forms/src/common/definitions/check-result.def.js
 */

import { pwixI18n } from 'meteor/pwix:i18n';

export const CheckResult = {

    K: {
        INVALID: {
            class: 'fci-invalid',
            icon: 'fa-xmark',
            title: 'field_check.invalid_title'
        },
        NONE: {
            class: 'fci-none',
            icon: 'fa-ellipsis',
            title: 'field_check.none_title'
        },
        UNCOMPLETE: {
            class: 'fci-uncomplete',
            icon: 'fa-person-digging',
            title: 'field_check.uncomplete_title'
        },
        VALID: {
            class: 'fci-valid',
            icon: 'fa-check',
            title: 'field_check.valid_title'
        }
    },

    // check that the type is known
    _byType( type ){
        if( !Object.keys( CheckResult.K ).includes( type )){
            console.warn( 'CheckResult: unknown type', type );
            return null;
        }
        return CheckResult.K[type];
    },

    /**
     * @returns {Array} the list of defined check types
     */
    Knowns(){
        return Object.keys( CheckResult.K );
    },

    /**
     * @returns {String} the classes associated with this type
     */
    classes( type ){
        const o = CheckResult._byType( type );
        return o ? o.class : null;
    },

    /**
     * @returns {String} the name of the icon associated with this type
     */
    icon( type ){
        const o = CheckResult._byType( type );
        return o ? o.icon : '';
    },

    /**
     * @returns {String} the title associated with this type
     */
    title( type ){
        const o = CheckResult._byType( type );
        return o && o.title ? pwixI18n.label( I18N, o.title ) : '';
    }
}
