/*
 * pwix:forms/src/common/i18n/fr.js
 */

Forms.i18n = {
    ... Forms.i18n,
    ... {
        fr: {
            field_check: {
                none_title: '',
                invalid_title: 'Cette valeur n\'est pas valide, et bloque la sauvegarde du document',
                uncomplete_title: 'Cette valeur n\'est pas renseignée ou n\'est pas valide, bien qu\'elle le devrait. '
                    +'Cela ne devrait pas empêcher de sauvegarder le document , mais le résultat peut ne pas être complètement opérationnel',
                valid_title: 'La valeur est valide'
            },
            field_type: {
                info_title: 'Cette valeur n\'est affichée que pour information, ne peut pas être modifiée ici',
                optional_title: 'Cette valeur est optionelle',
                save_title: 'Cette valeur est obligatoire; elle doit être renseignée et valide pour que le document puisse être sauvegardé',
                work_title: 'Cette valeur est obligatoire, mais n\'empêchera pas le document d\'être sauvegardé. '
                    +'En tout état de cause, vous devrez probablement revenir ici et positionner une valeur valide pour que le résultat soit pleinement opérationnel'
            }
        }
    }
};
