import { useMediaQuery } from "react-responsive";

const useScreenType = (): string => {
	const isFull: boolean = useMediaQuery({ minWidth: 1490 });
	const isHalfActivityBar: boolean = useMediaQuery({ minWidth: 1316 });
	const isTablet: boolean = useMediaQuery({ minWidth: 815 });

	if (isFull) {
		//console.log('full');
		return "full";
	} else if (isHalfActivityBar) {
		//console.log('half active bar');
		return "halfActivityBar";
	} else if (isTablet) {
		//console.log('tablet');
		return "tablet";
	} else {
		//console.log('mobile');
		return "mobile";
	}
};

export default useScreenType;
