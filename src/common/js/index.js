/*
 * pwix:forms/src/common/js/index.js
 */

import { Messager } from '../classes/messager.class.js';

import { CheckStatus } from '../definitions/check-status.def';
import { FieldType } from '../definitions/field-type.def';

import { ICheckable } from '../interfaces/icheckable.iface';
import { IMessager } from '../interfaces/imessager.iface';
import { IStatusable } from '../interfaces/istatusable.iface';

import './global.js';
import './constants.js';
import './i18n.js';
import './trace.js';
//
import './configure.js';
import './functions.js';

Forms.Messager = Messager;

Forms.CheckStatus = CheckStatus;
Forms.FieldType = FieldType;

Forms.ICheckable = ICheckable;
Forms.IMessager = IMessager;
Forms.IStatusable = IStatusable;
