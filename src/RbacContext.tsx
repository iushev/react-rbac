import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { RuleParams, Rule, RuleCtor } from "@iushev/rbac";
import RbacCheckAccess from "./RbacCheckAccess";

export type RuleParamsFunction = () => RuleParams;
export type MatchFunction = () => boolean;
export type CheckAccessOptions = {
  roles: string[];
  allow?: boolean;
  params?: RuleParams | RuleParamsFunction;
  match?: MatchFunction;
};

export type RbacContextProps = {
  checkAccess: (options: CheckAccessOptions) => Promise<boolean>;
};

const RbacContext = React.createContext<RbacContextProps>({
  checkAccess: async (_options: CheckAccessOptions) => true,
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
  const [rbac, setRbac] = useState<RbacCheckAccess | null>(null);

  useEffect(() => {
    if (!token) {
      setRbac(null);
    } else {
      const _rbac = new RbacCheckAccess({
        path: rbacUrl,
        authorization: () => {
          return token;
        },
      });
      _rbac.load().then(() => setRbac(_rbac));
    }
  }, [rbacUrl, token]);

  const matchRole = useCallback(async (roles, params) => {
    if (!roles || roles.length === 0) {
      return true;
    }

    for (const role of roles) {
      if (role === "?" && isGuest) {
        // only guest users
        return true;
      } else if (role === "@" && !isGuest) {
        // only authenticated users
        return true;
      } else if (await rbac?.checkAccess(username, role, typeof params === "function" ? params() : params)) {
        // only authenticated users that has permission
        return true;
      } else {
        continue;
      }
    }

    return false;
  }, []);

  const matchCustom = useCallback((match) => {
    if (!match) {
      return true;
    }
    return match();
  }, []);

  const checkAccess = useCallback(async ({ roles, allow = true, match, params = {} }: CheckAccessOptions) => {
    return isSuperuser || ((await matchRole(roles, params)) && matchCustom(match) && allow);
  }, []);

  const value = useMemo(() => {
    return {
      checkAccess,
    };
  }, [rbac, username, isGuest, isSuperuser]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const RbacConsumer = RbacContext.Consumer;

export const useRbac = (): RbacContextProps => {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    throw new Error("useRbac must be rendered under RbacProvider");
  }
  return ctx;
};

export default RbacContext;
