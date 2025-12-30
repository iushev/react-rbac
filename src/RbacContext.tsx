import React, { useCallback, useContext, useMemo } from "react";

import { RuleParams, RbacUser, matchRole, Identity, BaseManager } from "@iushev/rbac";

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
  identity: Identity;
  authManager: BaseManager;
  children: React.ReactNode;
  logging?: ((...args: any[]) => void);
};

export const RbacProvider: React.FC<RbacProviderProps> = ({
  identity,
  authManager,
  children,
  logging,
}) => {
  const checkAccess = useCallback(
    async ({ roles, allow = true, match, params = {}, logging: loggingOption = false }: CheckAccessOptions) => {
      const matchCustom = (match?: MatchFunction) => {
        if (!match) {
          return true;
        }
        return match();
      };

      const user = new RbacUser(authManager);
      user.identity = identity;

      return user.isSuperuser || ((await matchRole({ user, roles, params, logging: loggingOption ? loggingOption : logging })) && matchCustom(match) && allow);
    },
    [identity, authManager, logging],
  );

  const value = useMemo(() => {
    return {
      checkAccess,
    };
  }, [checkAccess]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const RbacConsumer = RbacContext.Consumer;

export default RbacContext;
