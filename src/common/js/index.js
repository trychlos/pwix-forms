/*
 * pwix:forms/src/common/js/index.js
 */

import { Field } from '../classes/field.class.js';
import { FieldsSet } from '../classes/fields-set.class.js';

import { FieldCheck } from '../definitions/field-check.def';
import { FieldType } from '../definitions/field-type.def';

import './global.js';
import './constants.js';
import './i18n.js';
import './configure.js';
//
import './functions.js';

Forms.Field = Field;
Forms.FieldsSet = FieldsSet;

Forms.FieldCheck = FieldCheck;
Forms.FieldType = FieldType;
