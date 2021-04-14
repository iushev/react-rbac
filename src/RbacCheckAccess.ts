import {
  Assignment,
  BaseCheckAccess,
  BaseCheckAccessOptions,
  Item,
  ItemType,
  Permission,
  Role,
  Rule,
  RuleParams,
} from "@iushev/rbac";

import axios, { AxiosInstance } from "axios";

export type RbacCheckAccessOptions = BaseCheckAccessOptions & {
  path: string;
  authorization: () => string;
};

export default class RbacCheckAccess extends BaseCheckAccess {
  private axiosInstance: AxiosInstance;

  protected assignments: Map<string, Assignment> = new Map();

  constructor(options: RbacCheckAccessOptions) {
    super(options);

    this.axiosInstance = axios.create({
      baseURL: options.path,
    });

    this.axiosInstance.interceptors.request.use((config) => {
      if (options.authorization) {
        const token = options.authorization();
        config.headers.common["Authorization"] = "Bearer " + token;
      } else {
        config.headers.common["Authorization"] = null;
      }
      return config;
    });
  }

  public async checkAccess(username: string, itemName: string, params: RuleParams): Promise<boolean> {
    return super.checkAccess(username, itemName, params, this.assignments);
  }

  protected async load(): Promise<void> {
    const response = await this.axiosInstance.get("/rbac");

    const _rbac = response.data;

    this.items = Object.keys(_rbac.items).reduce<Map<string, Item>>((prevValue, name) => {
      const item = _rbac.items[name];
      const ItemClass = item.type === ItemType.permission ? Permission : Role;
      prevValue.set(
        name,
        new ItemClass({
          name,
          type: item.type,
          description: item.description ?? null,
          ruleName: item.ruleName ?? null,
        })
      );
      return prevValue;
    }, new Map());

    this.parents = Object.keys(_rbac.items).reduce<Map<string, Map<string, Item>>>((prevValue, name) => {
      const item = _rbac.items[name];
      if (!item.children || item.children.length === 0) {
        return prevValue;
      }
      item.children.forEach((childName: string) => {
        if (!this.items.has(childName)) {
          return;
        }

        if (!prevValue.has(childName)) {
          prevValue.set(childName, new Map());
        }

        prevValue.get(childName)!.set(name, this.items.get(name)!);
      });

      return prevValue;
    }, new Map());

    this.rules = Object.keys(_rbac.rules).reduce<Map<string, Rule>>((prevValue, name) => {
      const ruleData = _rbac.rules[name];
      const RuleClass = this.ruleClasses.get(ruleData.data.typeName) ?? Rule;
      const rule = new RuleClass(name, JSON.parse(ruleData.data.rule));
      prevValue.set(name, rule);
      return prevValue;
    }, new Map());

    this.assignments = _rbac.assignments;
  }
}
