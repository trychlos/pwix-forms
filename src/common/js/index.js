/*
 * pwix:forms/src/common/js/index.js
 */

import { Field } from '../classes/field.class.js';
import { FieldsSet } from '../classes/fields-set.class.js';
import { Messager } from '../classes/messager.class.js';

import { CheckResult } from '../definitions/check-result.def';
import { FieldType } from '../definitions/field-type.def';

import { IMessager } from '../interfaces/imessager.iface';
import { ISchema } from '../interfaces/ischema.iface';
import { ITabular } from '../interfaces/itabular.iface';

import './global.js';
import './constants.js';
import './i18n.js';
//
import './configure.js';
import './functions.js';

Forms.Field = Field;
Forms.FieldsSet = FieldsSet;
Forms.Messager = Messager;

Forms.CheckResult = CheckResult;
Forms.FieldType = FieldType;

Forms.IMessager = IMessager;
Forms.ISchema = ISchema;
Forms.ITabular = ITabular;
