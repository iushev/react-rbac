import React, { useContext } from "react";
import { RuleParams } from "@iushev/rbac";

import RbacContext from "./RbacContext";
import NoAccess from "./NoAccess";

export type MatchFunction = () => boolean;

export type CheckAccessProps = {
  allow?: boolean;
  roles: string[];
  // roleParams?: RoleParams | RoleParamsFunction;
  roleParams?: RuleParams;
  match?: MatchFunction;
  noAccess?: React.ComponentType;
};

const CheckAccess: React.FC<CheckAccessProps> = ({
  allow = true,
  roles,
  roleParams = {},
  match,
  noAccess: NoAccessComponent = NoAccess,
  children,
}) => {
  const rbac = useContext(RbacContext);

  const matchRole = () => {
    if (!roles || roles.length === 0) {
      return true;
    }

    let _roleParams = roleParams;
    if (typeof roleParams === "function") {
      _roleParams = roleParams();
    }

    return roles.some((role) => rbac.checkAccess(role, _roleParams));
  }

  const matchCustom = () => {
    if (!match) {
      return true;
    }
    return match();
  }

  if (matchRole() && matchCustom() && allow) {
    return (
      <>
        { children }
      </>
    );
  }

  return <NoAccessComponent />;
};

export default CheckAccess;
