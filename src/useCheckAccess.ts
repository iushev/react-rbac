import { useContext, useEffect, useState } from "react";
import RbacContext, { CheckAccessOptions } from "./RbacContext";

export type CheckAssessState = {
  checking: boolean;
  hasAccess: boolean;
};

function useCheckAccess({ roles, allow, params, match }: CheckAccessOptions) {
  const rbac = useContext(RbacContext);

  const [state, setState] = useState<CheckAssessState>({
    checking: true,
    hasAccess: false,
  });

  useEffect(() => {
    let subscribed = true;
    setState({
      checking: true,
      hasAccess: false,
    });

    rbac
      .checkAccess({ roles, allow, params, match })
      .then((result) => {
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: result,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: false,
          });
        }
      });

    return () => {
      subscribed = false;
    };
  }, [rbac, roles, allow, params, match]);

  return state;
}

export default useCheckAccess;
