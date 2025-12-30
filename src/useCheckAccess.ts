import { useEffect, useState } from "react";
import { CheckAccessOptions, useRbac } from "./RbacContext";

export type CheckAccessState = {
  checking: boolean;
  hasAccess: boolean;
};

function useCheckAccess({ roles, allow, params, match, logging }: CheckAccessOptions) {
  const { checkAccess } = useRbac();

  const [state, setState] = useState<CheckAccessState>({
    checking: true,
    hasAccess: false,
  });

  useEffect(() => {
    let subscribed = true;

    const _checkAccess = async () => {
      setState({
        checking: true,
        hasAccess: false,
      });

      try {
        const result = await checkAccess({ roles, allow, params, match, logging });
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: result,
          });
        }
      } catch (err) {
        console.error(err);
        if (subscribed) {
          setState({
            checking: false,
            hasAccess: false,
          });
        }
      }
    };

    _checkAccess();

    return () => {
      subscribed = false;
    };
  }, [roles, allow, params, match, logging, checkAccess]);

  return state;
}

export default useCheckAccess;
