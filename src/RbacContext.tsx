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
  rbac: RbacCheckAccess | null;
  checkAccess: (options: CheckAccessOptions) => Promise<boolean>;
};

const RbacContext = React.createContext<RbacContextProps>({
  rbac: null,
  checkAccess: async () => true,
});

export type RbacProviderProps = {
  username: string;
  rbacUrl: string;
  token: string;
  isSuperuser: boolean;
  isGuest: boolean;
  ruleClasses: Map<string, RuleCtor<Rule>>;
  children: React.ReactNode;
};

export const RbacProvider: React.FC<RbacProviderProps> = ({
  username,
  rbacUrl,
  token,
  isSuperuser,
  isGuest,
  ruleClasses: _ruleClasses,
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

  const matchRole = useCallback(
    async (roles: string[], params: RuleParams | RuleParamsFunction) => {
      if (!roles || roles.length === 0) {
        return true;
      }

      if (!rbac) {
        return false;
      }

      for (const role of roles) {
        if (role === "?" && isGuest) {
          // only guest users
          return true;
        } else if (role === "@" && !isGuest) {
          // only authenticated users
          return true;
        } else if (await rbac.checkAccess(username, role, typeof params === "function" ? params() : params)) {
          // only authenticated users that has permission
          return true;
        } else {
          continue;
        }
      }

      return false;
    },
    [isGuest, rbac, username],
  );

  const matchCustom = useCallback((match?: MatchFunction) => {
    if (!match) {
      return true;
    }
    return match();
  }, []);

  const checkAccess = useCallback(
    async ({ roles, allow = true, match, params = {} }: CheckAccessOptions) => {
      return isSuperuser || ((await matchRole(roles, params)) && matchCustom(match) && allow);
    },
    [isSuperuser, matchCustom, matchRole],
  );

  const value = useMemo(() => {
    return {
      rbac,
      checkAccess,
    };
  }, [rbac, checkAccess]);

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
