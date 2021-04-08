import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

import {
  Permission,
  Role,
  Item as RbacItem,
  Rule as RbacRule,
  ItemType as RbacItemType,
  RBACResponse,
  RuleParams,
  Rule,
  RuleCtor,
  Item,
} from "@iushev/rbac";

export type RbacContextProps = {
  checkAccess: (permissionName: string, params: RuleParams) => boolean;
};

const RbacContext = React.createContext<RbacContextProps>({
  checkAccess: (_permissionName: string, _params: RuleParams) => true,
});

export type RbacProviderProps = {
  username: string;
  rbacUrl: string;
  token: string;
  isSuperuser: boolean;
  isGuest: boolean;
  ruleClasses: Map<string, RuleCtor<Rule>>;
};

export const RbacProvider: React.FC<RbacProviderProps> = ({
  username,
  rbacUrl,
  token,
  isSuperuser,
  isGuest,
  ruleClasses,
  children,
}) => {
  const [items, setItems] = useState<Map<string, RbacItem>>(new Map());
  const [parents, setParents] = useState<Map<string, Map<string, RbacItem>>>(new Map());
  const [rules, setRules] = useState<Map<string, RbacRule>>(new Map());
  const [assignments, setAssignments] = useState<Array<string>>([]);

  const fetchRbac = useCallback(async () => {
    const response = await axios.get<RBACResponse>(rbacUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const _rbac = response.data;

    setItems(
      Object.keys(_rbac.items).reduce<Map<string, RbacItem>>((prevValue, name) => {
        const item = _rbac.items[name];
        const ItemClass = item.type === RbacItemType.permission ? Permission : Role;
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
      }, new Map())
    );

    setParents(
      Object.keys(_rbac.items).reduce<Map<string, Map<string, RbacItem>>>((prevValue, name) => {
        const item = _rbac.items[name];
        if (!item.children || item.children.length === 0) {
          return prevValue;
        }
        item.children.forEach((childName: string) => {
          if (!items.has(childName)) {
            return;
          }

          if (!prevValue.has(childName)) {
            prevValue.set(childName, new Map());
          }

          prevValue.get(childName)!.set(name, items.get(name)!);
        });

        return prevValue;
      }, new Map())
    );

    setRules(
      Object.keys(_rbac.rules).reduce<Map<string, RbacRule>>((prevValue, name) => {
        const ruleData = _rbac.rules[name];
        const RuleClass = ruleClasses.get(ruleData.data.typeName) ?? Rule;
        const rule = new RuleClass(name, JSON.parse(ruleData.data.rule));
        prevValue.set(name, rule);
        return prevValue;
      }, new Map())
    );

    setAssignments(_rbac.assignments);
  }, [rbacUrl, token, ruleClasses]);

  useEffect(() => {
    fetchRbac();
  }, [fetchRbac]);

  const executeRule = (item: Item, params: RuleParams): boolean => {
    if (!item.ruleName) {
      return true;
    }

    const rule = rules?.get(item.ruleName);

    if (!rule) {
      throw new Error(`Rule "${item.ruleName}" does not exists. Or rules does not loaded.`);
    }

    return rule.execute(username, item, params);
  };

  const checkAccessRecursive = (permissionName: string, params: RuleParams) => {
    const item = items.get(permissionName);

    if (!item) {
      return false;
    }

    if (!executeRule(item, params)) {
      return false;
    }

    if (assignments.indexOf(permissionName) > -1 /* || defaultRoles.includes(itemName)*/) {
      return true;
    }

    const permissionParents = parents.get(permissionName);
    if (permissionParents && permissionParents.size > 0) {
      for (let parentName of permissionParents.keys()) {
        if (checkAccessRecursive(parentName, params)) {
          return true;
        }
      }
    }
    return false;
  };

  const checkAccess = (permissionName: string, params: RuleParams) => {
    if (isSuperuser) {
      return true;
    }

    if (permissionName === "?") {
      if (isGuest) {
        return true;
      }
    } else if (permissionName === "@") {
      if (!isGuest) {
        return true;
      }
    }

    // if (allowCaching && params.length === 0 && this._access[permissionName]) {
    //   return this._access[permissionName];
    // }

    const access = checkAccessRecursive(permissionName, params);
    // if (allowCaching && params.length === 0) {
    //   this._access[permissionName] = access;
    // }

    return access;
  };

  return (
    <RbacContext.Provider
      value={{
        checkAccess,
      }}
    >
      {children}
    </RbacContext.Provider>
  );
};

export const RbacConsumer = RbacContext.Consumer;
export default RbacContext;
