/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agents_addMessage from "../agents/addMessage.js";
import type * as agents_createTask from "../agents/createTask.js";
import type * as agents_deleteTask from "../agents/deleteTask.js";
import type * as agents_getTask from "../agents/getTask.js";
import type * as agents_getTemplates from "../agents/getTemplates.js";
import type * as agents_internal from "../agents/internal.js";
import type * as agents_listTasks from "../agents/listTasks.js";
import type * as agents_shareTask from "../agents/shareTask.js";
import type * as agents_updateTaskStatus from "../agents/updateTaskStatus.js";
import type * as http from "../http.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "agents/addMessage": typeof agents_addMessage;
  "agents/createTask": typeof agents_createTask;
  "agents/deleteTask": typeof agents_deleteTask;
  "agents/getTask": typeof agents_getTask;
  "agents/getTemplates": typeof agents_getTemplates;
  "agents/internal": typeof agents_internal;
  "agents/listTasks": typeof agents_listTasks;
  "agents/shareTask": typeof agents_shareTask;
  "agents/updateTaskStatus": typeof agents_updateTaskStatus;
  http: typeof http;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
