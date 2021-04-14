import React, { useContext, useEffect, useState } from "react";

import RbacContext, { CheckAccessOptions } from "./RbacContext";
import NoAccess from "./NoAccess";

export type CheckAccessProps = CheckAccessOptions & {
  busy?: React.ComponentType;
  noAccess?: React.ComponentType;
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
  const rbac = useContext(RbacContext);

  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setChecking(true);
    setHasAccess(false);

    rbac.checkAccess({ roles, allow, params, match })
      .then((result) => {
        setChecking(false);
        setHasAccess(result);
      })
      .catch(() => {
        setChecking(false);
        setHasAccess(false);
      });
  }, []);

  if (checking) {
    return <BusyComponent />;
  }

  return <>{hasAccess ? <>{children}</> : <NoAccessComponent />}</>;
};

export default CheckAccess;
