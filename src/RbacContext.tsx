import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { RuleParams, Rule, RuleCtor, RbacUser, matchRole, Identity, BaseManager } from "@iushev/rbac";
import { WebManager } from "@iushev/rbac-web-manager";

export type RuleParamsFunction = () => RuleParams;
export type MatchFunction = () => boolean;
export type CheckAccessOptions = {
  roles: string[];
  allow?: boolean;
  params?: RuleParams | RuleParamsFunction;
  match?: MatchFunction;
  logging?: false | ((...args: any[]) => void);
};

export type RbacContextProps = {
  rbacManager: BaseManager | null;
  checkAccess: (options: CheckAccessOptions) => Promise<boolean>;
};

const RbacContext = React.createContext<RbacContextProps | null>(null);

export const useRbac = (): RbacContextProps => {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    throw new Error("useRbac must be rendered under RbacProvider");
  }
  return ctx;
};

export type RbacProviderProps = {
  identity: Identity | null;
  rbacUrl: string;
  token: string;
  ruleClasses: Map<string, RuleCtor<Rule>>;
  afterInitManager?: (webManager: any) => void;
  children: React.ReactNode;
  logging?: false | ((...args: any[]) => void);
};

export const RbacProvider: React.FC<RbacProviderProps> = ({
  identity,
  rbacUrl,
  token,
  ruleClasses,
  children,
  logging,
}) => {
  const [rbacManager, setRbacManager] = useState<BaseManager | null>(null);

  useEffect(() => {
    const initRbac = async () => {
      const manager = new WebManager({
        path: rbacUrl,
        authorization: () => {
          return token;
        },
        logging,
      });
      ruleClasses.forEach((RuleClass, ruleName) => {
        manager.ruleClasses.set(ruleName, RuleClass);
      });
      if (identity) {
        await manager.load();
      }
      setRbacManager(manager);
    };

    initRbac();
  }, [identity, logging, rbacUrl, ruleClasses, token]);

  const checkAccess = useCallback(
    async ({ roles, allow = true, match, params = {}, logging: loggingOption = false }: CheckAccessOptions) => {
      if (!rbacManager) {
        return false;
      }

      const matchCustom = (match?: MatchFunction) => {
        if (!match) {
          return true;
        }
        return match();
      };

      const user = new RbacUser(rbacManager);
      user.identity = identity;

      return user.isSuperuser || ((await matchRole({ user, roles, params, logging: loggingOption ? loggingOption : logging })) && matchCustom(match) && allow);
    },
    [identity, rbacManager, logging],
  );

  const value = useMemo(() => {
    return {
      rbacManager,
      checkAccess,
    };
  }, [rbacManager, checkAccess]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const RbacConsumer = RbacContext.Consumer;

export default RbacContext;
