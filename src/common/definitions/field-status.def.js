/*
 * pwix:forms/src/common/definitions/field-status.def.js
 */

import _ from 'lodash';

import { pwixI18n } from 'meteor/pwix:i18n';

export const FieldStatus = {
    C: {
        INVALID:    'INVALID',
        NONE:       'NONE',
        UNCOMPLETE: 'UNCOMPLETE',
        VALID:      'VALID'
    },
    K: {
        INVALID: {
            class: 'fcsi-invalid',
            icon: 'fa-xmark',
            title: 'field_check.invalid_title'
        },
        NONE: {
            class: 'fcsi-none',
            icon: 'fa-ellipsis',
            title: 'field_check.none_title'
        },
        UNCOMPLETE: {
            class: 'fcsi-uncomplete',
            icon: 'fa-person-digging',
            title: 'field_check.uncomplete_title'
        },
        VALID: {
            class: 'fcsi-valid',
            icon: 'fa-check',
            title: 'field_check.valid_title'
        }
    }
};
_.merge( FieldStatus, {
    Order: [
        FieldStatus.C.NONE,
        FieldStatus.C.VALID,
        FieldStatus.C.UNCOMPLETE,
        FieldStatus.C.INVALID
    ],

    // check that the type is known
    _byType( type ){
        if( !Object.keys( FieldStatus.K ).includes( type )){
            console.warn( 'FieldStatus: unknown type', type );
            return null;
        }
        return FieldStatus.K[type];
    },

    /**
     * @returns {Array} the list of defined check types
     */
    Knowns(){
        return Object.keys( FieldStatus.K );
    },

    /**
     * @returns {String} the classes associated with this type
     */
    classes( type ){
        const o = FieldStatus._byType( type );
        return o ? o.class : null;
    },

    /**
     * @returns {String} the name of the icon associated with this type
     */
    icon( type ){
        const o = FieldStatus._byType( type );
        return o ? o.icon : '';
    },

    /**
     * @param {FieldStatus} status
     * @returns {Integer} the index of the status in the 'Order' array
     */
    index( status ){
        for( let i=0 ; i<FieldStatus.Order.length ; ++i ){
            if( FieldStatus.Order[i] === status ){
                return i;
            }
        }
        console.error( 'status not ordered', status );
        return -1;
    },

    /**
     * @returns {String} the title associated with this type
     */
    title( type ){
        const o = FieldStatus._byType( type );
        return o && o.title ? pwixI18n.label( I18N, o.title ) : '';
    },

    /**
     * @param {Array<FieldStatus>} array a list of statuses
     * @returns {FieldStatus} the worst statuses
     */
    worst( statuses ){
        let max = -1;
        statuses.forEach(( st ) => {
            const index = FieldStatus.index( st );
            if( index > max ){
                max = index;
            }
        });
        return FieldStatus.Order[max];
    }
});
