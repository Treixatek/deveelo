import { useState } from "react";
import { useRouter } from "next/router";

import formStyles from "../../styles/form.module.css";
import sidebarStyles from "../../styles/sidebar.module.css";
import TextButton from "../micro/TextButton";
import { useUpdateProfileMutation, MyNameAndPfpDocument, MyNameAndPfpQuery } from "../../hooks/backend/generated/graphql";
import { updateSidebar } from "../../hooks/socialhooks";

interface UserFormPresets {
	name: string;
	tag: string;
	description: string;
}

const ProfileEditForm = ({ name, tag, description }: UserFormPresets) => {
	const router = useRouter();

	//user input captures
	const [newName, setNewName] = useState(name);
	const [newTag, setNewTag] = useState(tag);
	const [newDescription, setNewDescription] = useState(description);

	//api
	const [UpdateProfile] = useUpdateProfileMutation();

	return (
		<form
			className={formStyles.pFormContainer}
			onSubmit={async (e) => {
				e.preventDefault();

				try {
					const response = await UpdateProfile({
						variables: {
							newname: newName,
							newtag: newTag,
							newdes: newDescription,
						},
						update: (store, { data }) => {
							if (!data) {
								return null;
							}
							//update cache for name&pfp query

							store.writeQuery<MyNameAndPfpQuery>({
								query: MyNameAndPfpDocument,
								data: {
									myAccount: {
										_id: data.updateProfile._id,
										account: {
											username: data.updateProfile.account.username,
											tag: data.updateProfile.account.tag,
										},
										profile: {
											pictureUrl: data.updateProfile.profile.pictureUrl,
										},
									},
								},
							});
						},
					});

					if (response && response.data) {
						updateSidebar("edittoggle");
						//go to the new user profile if tag change
						const finalTag = response.data.updateProfile.account.tag;
						if (finalTag !== tag) {
							router.push(`/${finalTag}`);
						}
					}
				} catch (error) {
					if (error.graphQLErrors[0].extensions.errors) {
						//errors with user input reported in backend check
						const inputErrs = error.graphQLErrors[0].extensions.errors;
						console.log(inputErrs);

						//handleSubmitErrors(inputErrs);
					}
				}
			}}>
			<div className={formStyles.fieldThin}>
				<input
					className={formStyles.input}
					value={newName}
					type="text"
					name="editname"
					placeholder=" "
					onChange={(e) => {
						setNewName(e.target.value);
					}}
				/>
				<label htmlFor="editname" className={formStyles.label}>
					Username
				</label>
				{/* <p className={formStyles.error}>{emailErr}</p> */}
			</div>
			<div className={formStyles.fieldThin}>
				<input
					className={formStyles.input}
					value={newTag}
					type="text"
					name="edittag"
					placeholder=" "
					onChange={(e) => {
						setNewTag(e.target.value);
					}}
				/>
				<label htmlFor="edittag" className={formStyles.label}>
					@ handle
				</label>
				{/* <p className={formStyles.error}>{emailErr}</p> */}
			</div>
			<div className={formStyles.fieldThin}>
				<input
					className={formStyles.input}
					value={newDescription}
					type="text"
					name="editdes"
					placeholder=" "
					onChange={(e) => {
						setNewDescription(e.target.value);
					}}
				/>
				<label htmlFor="editdes" className={formStyles.label}>
					Description
				</label>
				{/* <p className={formStyles.error}>{emailErr}</p> */}
			</div>
			<div className={sidebarStyles.buttonContainer}>
				<TextButton colorKey="green" text="Save" submit={true} large={false} />
			</div>
		</form>
	);
};

export default ProfileEditForm;
