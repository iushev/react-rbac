import React from "react";

import { CheckAccessOptions } from "./RbacContext";
import useCheckAccess from "./useCheckAccess";
import NoAccess from "./NoAccess";

export type CheckAccessProps = CheckAccessOptions & {
  busy?: React.ComponentType;
  noAccess?: React.ComponentType;
  children: React.ReactNode;
};

const CheckAccess: React.FC<CheckAccessProps> = ({
  roles,
  allow,
  params,
  match,
  busy: BusyComponent = () => null,
  noAccess: NoAccessComponent = NoAccess,
  children,
}) => {
  const { checking, hasAccess } = useCheckAccess({ roles, allow, params, match });

  if (checking) {
    return <BusyComponent />;
  }

  return <>{hasAccess ? <>{children}</> : <NoAccessComponent />}</>;
};

export default CheckAccess;
