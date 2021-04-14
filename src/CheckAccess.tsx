import React, { useContext, useEffect, useRef, useState } from "react";

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
  const componentIsMounted = useRef(true);
  const rbac = useContext(RbacContext);

  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    return () => {
      componentIsMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setChecking(true);
    setHasAccess(false);

    rbac
      .checkAccess({ roles, allow, params, match })
      .then((result) => {
        if (componentIsMounted.current) {
          setChecking(false);
          setHasAccess(result);
        }
      })
      .catch(() => {
        if (componentIsMounted.current) {
          setChecking(false);
          setHasAccess(false);
        }
      });
  }, [rbac, roles, allow, params, match]);

  if (checking) {
    return <BusyComponent />;
  }

  return <>{hasAccess ? <>{children}</> : <NoAccessComponent />}</>;
};

export default CheckAccess;
