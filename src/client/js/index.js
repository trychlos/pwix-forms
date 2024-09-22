/*
 * pwix:forms/src/client/js/index.js
 */

import { Checker } from '../classes/checker.class';
import { Messager } from '../classes/messager.class.js';
import { Panel } from '../classes/panel.class';

import { ICheckable } from '../interfaces/icheckable.iface';
import { IMessager } from '../interfaces/imessager.iface';
import { IStatusable } from '../interfaces/istatusable.iface';

import '../../common/js/index.js';

// provides base classes to Forms global object

import '../stylesheets/forms.less';

Forms.Checker = Checker;
Forms.Messager = Messager;
Forms.Panel = Panel;

Forms.ICheckable = ICheckable;
Forms.IMessager = IMessager;
Forms.IStatusable = IStatusable;
