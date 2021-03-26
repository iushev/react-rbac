import React, { useContext } from "react";
// import { UserContext } from '../UserContext';

export type RoleParams = { [key: string]: any };
export type RoleParamsFunction = () => RoleParams;
export type MatchFunction = () => boolean;

export type CheckAccessProps = {
  allow?: boolean;
  roles: string[];
  roleParams?: RoleParams | RoleParamsFunction;
  match?: MatchFunction;
  noAccess: React.ComponentType;
};

const CheckAccess: React.FC<CheckAccessProps> = ({
  allow = true,
  roles,
  roleParams,
  match,
  noAccess: NoAccess,
  children,
}) => {
  // const user = useContext(UserContext);

  const matchRole = () => {
    if (!roles || roles.length === 0) {
      return true;
    }

    let _roleParams = roleParams;
    if (typeof roleParams === "function") {
      _roleParams = roleParams();
    }

    return true; //roles.some((role) => user.can(role, _roleParams));
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

  return <NoAccess />;
};

export default CheckAccess;
