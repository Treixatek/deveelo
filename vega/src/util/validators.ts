//allow dynamic adding of fields
interface LooseErrors {
	[key: string]: any;
}

const ValidateRegisterInput = (input: string, type: string) => {
	const errors: LooseErrors = {};

	switch (type) {
		case "email":
			if (input === undefined || input.trim() === "") {
				errors.email = "Email field is required";
			}
			//checks for script tags & harmful names
			else if (
				String(input).includes("<") ||
				String(input).includes(":") ||
				String(input).includes(">") ||
				String(input).includes("&") ||
				String(input).includes("%") ||
				String(input).includes("`") ||
				String(input).includes("'") ||
				String(input).includes(`"`) ||
				String(input).includes("|") ||
				String(input).includes("*") ||
				String(input).includes("\\") ||
				String(input).includes("/")
			) {
				errors.email = "only _ {} () ^ + = ? - ! # are allowed";
			}
			//format of an email address
			else {
				const regEx = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;

				if (!input.match(regEx)) {
					errors.email = "Email is not valid";
				}
			}
			break;
		case "password":
			if (input === undefined || input === "") {
				errors.password = "Password field is required";
			} else if (String(input).length < 6) {
				errors.password = "Password must be at least 6 characters";
			}
			break;
		case "username":
			if (input === undefined || input.trim() === "") {
				errors.username = "email address is invalid";
			} else if (
				String(input).includes("<") ||
				String(input).includes(":") ||
				String(input).includes(">") ||
				String(input).includes("&") ||
				String(input).includes("%") ||
				String(input).includes("`") ||
				String(input).includes("'") ||
				String(input).includes(`"`) ||
				String(input).includes("|") ||
				String(input).includes("*") ||
				String(input).includes("\\") ||
				String(input).includes("/") ||
				String(input).includes("@")
			) {
				errors.username = "only _ {} () ^ + = ? - ! # are allowed";
			}
			break;
		default:
			errors.validation = "type not defined";
			break;
	}

	return {
		errors,
		valid: Object.keys(errors).length < 1,
	};
};

//this function checks to make sure that the file uploaded is of the supported
//type for the given purpose, i.e. no .zip or .rar for posts, no .gif for pfp uploads
// note  the extension does not include the period "." i.e: png, svg, webp
export const validateFileExtensions = (input: string, allowed: string[]) => {
	const errors: LooseErrors = {};

	if (!allowed.includes(input)) {
		errors.file = `Files of type ${input} are not supported`;
	}

	return {
		errors,
		valid: Object.keys(errors).length < 1,
	};
};

export default ValidateRegisterInput;
