import React, { useEffect, useMemo, useState } from "react";

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

  const value = useMemo(() => {
    const checkAccess = async ({ roles, allow = true, match, params = {} }: CheckAccessOptions) => {
      const matchRole = async () => {
        if (!roles || roles.length === 0) {
          return true;
        }

        let _params = params;
        if (typeof params === "function") {
          _params = params();
        }

        for (const role of roles) {
          if (role === "?") {
            if (isGuest) {
              return true;
            }
          } else if (role === "@") {
            if (!isGuest) {
              return true;
            }
          } else {
            if (await rbac?.checkAccess(username, role, _params)) {
              return true;
            }
          }
        }

        return false;
      };

      const matchCustom = () => {
        if (!match) {
          return true;
        }
        return match();
      };

      if (isSuperuser || ((await matchRole()) && matchCustom() && allow)) {
        return true;
      }

      return false;
    };

    return {
      checkAccess,
    };
  }, [rbac, username, isGuest, isSuperuser]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const RbacConsumer = RbacContext.Consumer;
export default RbacContext;
