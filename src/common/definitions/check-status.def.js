/*
 * pwix:forms/src/common/definitions/check-status.def.js
 */

import _ from 'lodash';

import { pwixI18n } from 'meteor/pwix:i18n';

export const CheckStatus = {
    C: {
        INVALID:    'INVALID',
        NONE:       'NONE',
        UNCOMPLETE: 'UNCOMPLETE',
        VALID:      'VALID'
    },
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
    }
};
_.merge( CheckStatus, {
    Order: [
        CheckStatus.C.NONE,
        CheckStatus.C.VALID,
        CheckStatus.C.UNCOMPLETE,
        CheckStatus.C.INVALID
    ],

    // check that the type is known
    _byType( type ){
        if( !Object.keys( CheckStatus.K ).includes( type )){
            console.warn( 'CheckStatus: unknown type', type );
            return null;
        }
        return CheckStatus.K[type];
    },

    /**
     * @returns {Array} the list of defined check types
     */
    Knowns(){
        return Object.keys( CheckStatus.K );
    },

    /**
     * @returns {String} the classes associated with this type
     */
    classes( type ){
        const o = CheckStatus._byType( type );
        return o ? o.class : null;
    },

    /**
     * @returns {String} the name of the icon associated with this type
     */
    icon( type ){
        const o = CheckStatus._byType( type );
        return o ? o.icon : '';
    },

    /**
     * @param {CheckStatus} status
     * @returns {Integer} the index of the status in the 'Order' array
     */
    index( status ){
        for( let i=0 ; i<CheckStatus.Order.length ; ++i ){
            if( CheckStatus.Order[i] === status ){
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
        const o = CheckStatus._byType( type );
        return o && o.title ? pwixI18n.label( I18N, o.title ) : '';
    },

    /**
     * @param {Array<CheckStatus>} array a list of statuses
     * @returns {CheckStatus} the worst statuses
     */
    worst( statuses ){
        console.debug( 'statuses', statuses );
        let max = -1;
        statuses.forEach(( st ) => {
            const index = CheckStatus.index( st );
            if( index > max ){
                max = index;
            }
        });
        return CheckStatus.Order[max];
    }
});
