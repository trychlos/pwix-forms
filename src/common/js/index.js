/*
 * pwix:forms/src/common/js/index.js
 */

import { Field } from '../classes/field.class.js';
import { FieldsSet } from '../classes/fields-set.class.js';

import { CheckStatus } from '../definitions/check-status.def';
import { FieldType } from '../definitions/field-type.def';

import { ICheckable } from '../interfaces/icheckable.iface';
import { IChecker } from '../interfaces/ichecker.iface';
import { IMessager } from '../interfaces/imessager.iface';
import { ISchema } from '../interfaces/ischema.iface';
import { IStatusable } from '../interfaces/istatusable.iface';
import { ITabular } from '../interfaces/itabular.iface';

import './global.js';
import './constants.js';
import './i18n.js';
//
import './configure.js';
import './functions.js';
import './trace.js';

Forms.Field = Field;
Forms.FieldsSet = FieldsSet;

Forms.CheckStatus = CheckStatus;
Forms.FieldType = FieldType;

Forms.ICheckable = ICheckable;
Forms.IChecker = IChecker;
Forms.IMessager = IMessager;
Forms.ISchema = ISchema;
Forms.IStatusable = IStatusable;
Forms.ITabular = ITabular;
