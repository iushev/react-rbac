import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import statusCodes from "http-status-codes";

import {
  Assignment,
  BaseCheckAccess,
  BaseCheckAccessOptions,
  IItem,
  ItemType,
  Permission,
  RBACResponse,
  Role,
  Rule,
  RuleParams,
} from "@iushev/rbac";

export type RbacCheckAccessOptions = BaseCheckAccessOptions & {
  path: string;
  authorization: () => string;
};

export default class RbacCheckAccess extends BaseCheckAccess {
  private readonly axiosInstance: AxiosInstance;

  protected assignments: Map<string, Map<string, Assignment>> = new Map();

  constructor(options: RbacCheckAccessOptions) {
    super(options);

    this.axiosInstance = axios.create({
      baseURL: options.path,
    });

    this.axiosInstance.interceptors.request.use((config) => {
      if (options.authorization) {
        const token = options.authorization();
        config.headers.Authorization = "Bearer " + token;
      } else {
        config.headers.Authorization = undefined;
      }
      return config;
    });
  }

  public async checkAccess(username: string, itemName: string, params: RuleParams): Promise<boolean> {
    if (this.items.size === 0) {
      await this.load();
    }

    return super.checkAccess(username, itemName, params, this.assignments.get(username) ?? new Map());
  }

  public async load(config?: AxiosRequestConfig): Promise<void> {
    let _rbac: RBACResponse;
    try {
      console.log("Load RBAC");
      const response = await this.axiosInstance.get<RBACResponse>("/rbac", config);
      _rbac = response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === statusCodes.NOT_FOUND) {
        _rbac = {
          assignments: {},
          items: {},
          rules: {},
        };
      } else {
        throw err;
      }
    }

    this.items = this.getRbacItems(_rbac);
    this.parents = this.getRbacParents(_rbac);
    this.rules = this.getRbacRules(_rbac);
    this.assignments = this.getRbacAssignments(_rbac);
  }

  private getRbacItems({ items }: RBACResponse) {
    return Object.keys(items).reduce<Map<string, IItem>>((prevValue, name) => {
      const item = items[name];
      const ItemClass = item.type === ItemType.permission ? Permission : Role;
      prevValue.set(
        name,
        new ItemClass({
          name,
          description: item.description ?? null,
          ruleName: item.ruleName ?? null,
        }),
      );
      return prevValue;
    }, new Map());
  }

  private getRbacParents({ items }: RBACResponse) {
    return Object.keys(items).reduce<Map<string, Map<string, IItem>>>((prevValue, name) => {
      const item = items[name];
      if (!item.children || item.children.length === 0) {
        return prevValue;
      }
      item.children.forEach((childName: string) => {
        if (!this.items.has(childName)) {
          return;
        }

        let child = prevValue.get(childName);

        if (!child) {
          child = new Map();
          prevValue.set(childName, child);
        }

        const item = this.items.get(name);
        if (item) {
          child.set(name, item);
        }
      });

      return prevValue;
    }, new Map());
  }

  private getRbacRules({ rules }: RBACResponse) {
    return Object.keys(rules).reduce<Map<string, Rule>>((prevValue, name) => {
      const ruleData = rules[name];
      const RuleClass = this.ruleClasses.get(ruleData.data.typeName) ?? Rule;
      const rule = new RuleClass(name, JSON.parse(ruleData.data.rule));
      prevValue.set(name, rule);
      return prevValue;
    }, new Map());
  }

  private getRbacAssignments({ assignments }: RBACResponse) {
    return Object.keys(assignments).reduce<Map<string, Map<string, Assignment>>>((prevValue, username) => {
      const _assignments = assignments[username];
      _assignments.forEach((itemName) => {
        if (prevValue.has(username)) {
          prevValue.get(username)?.set(itemName, new Assignment(username, itemName));
        } else {
          prevValue.set(username, new Map([[itemName, new Assignment(username, itemName)]]));
        }
      });
      return prevValue;
    }, new Map());
  }
}
