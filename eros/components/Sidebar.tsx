import Image from "next/image";
import { useEffect, useState } from "react";
import SimpleBar from "simplebar-react";
import "simplebar/dist/simplebar.min.css";

import sidebarStyles from "../styles/sidebar.module.css";
import NameGroup from "./micro/NameGroup";
import TextButton from "./micro/TextButton";
import ProfilePicture from "./micro/ProfilePicture";
import SocialList from "./minor/SocialList";
import ProfileEditForm from "./minor/ProfEditForm";

import { useFindMinProfileByTagQuery, useFollowMutation, useMyAccountMinProfileQuery, useRandomMinProfileQuery, useUnfollowMutation } from "../hooks/backend/generated/graphql";
import { getPayload } from "../accessToken";
import { updateSidebar } from "../hooks/socialhooks";
import { MinProfUserType } from "../lib/userTypes";
import { Fmod } from "../hooks/setSidebar";
import { bannerLoader } from "../hooks/loaders";

/* todo 
	+  Switch to unfollow button
	-  Persist unfollow button
	-  Preview sidebar loading display
	-  Content animate in
*/

interface sidebarProps {
	hardEdge?: boolean;
}

const Sidebar = ({ hardEdge }: sidebarProps) => {
	const [followUser] = useFollowMutation();
	const [unfollowUser] = useUnfollowMutation();

	hardEdge ??= true;

	//componentwide establishment of if we are logged in
	//and if we are, our user's id through the payload.id
	//if we get a payload back, we know that we are logged in
	let payload: any = getPayload();
	const loggedIn = payload !== null;

	//this is who's profile will be loaded into the sidebar
	let user: any = null;

	const loadingSidebar = (
		<div className={hardEdge ? sidebarStyles.sidebar_full : sidebarStyles.sidebar}>
			{/*Banner*/}
			<div className={sidebarStyles.banner} />
			{/*User Profile*/}
			<div className={sidebarStyles.profileContainer}>
				<div className="loading" />
			</div>
		</div>
	);

	if (!window) {
		return loadingSidebar;
	}

	const storage = window.localStorage;
	const [uTag, setSideProf] = useState(storage.getItem("side_prof"));
	const [rerender, setRerender] = useState(0);
	//rerender to load in edit profile form
	const [showEditForm, setShowEditForm] = useState(false);

	//used to increase change button on new follow
	const [followMod, setFollowMod] = useState(0);
	const setFMod = (value: string) => {
		if (value !== "" && value !== "0") {
			storage.setItem("fmod", `${value}|${uTag}`);
		} else {
			//RESET the fmod bc it has been either a + then a - or visa versa,
			//and a + and a - = 0, so we are back to the beginning what fmod = ""
			storage.setItem("fmod", "");
		}
	};

	const getFMod = (): Fmod => {
		const raw = storage.getItem("fmod");
		//raw will be null on first site visit (lastfm will not exist yet in localstorage)
		if (raw === "" || raw === null) {
			return {
				set: false,
				value: null,
				tag: null,
			};
		}

		const split = raw.split("|");
		console.log(split);

		return {
			set: true,
			value: parseInt(split[0]),
			tag: split[1],
		};
	};

	//handle seting local store update on mount & absFmod
	useEffect(() => {
		const handleUpdate = (e: CustomEvent) => {
			if (e.detail === null) {
				/*
				> Arbitrary reloading of the sidebar
				This can be used to rerender the sidebar any number of times:
				uses the current second and millisecond to generate
				a new number to set that new state int value
				*/
				const date = new Date();
				let randomSeed = date.getSeconds() + date.getMilliseconds();
				setRerender(randomSeed);
			} else if (e.detail === "newfollow") {
				/*
				> When the user clicks the follow button
				set the followMod to 1, this will be used to add a 1 to
				the follower count and also change the button to unfollow,
				this has to be done manually the first time, then it will
				be handled automatically by the gql queries
				*/
				let dif = 0;
				const fmod = getFMod();
				if (fmod.set) {
					dif = fmod.value;
				}

				//increase the absolute fmod by 1 bc we just added a follower
				setFMod((dif + 1).toString());
				//trigger rerender and change to unfollow button
				setFollowMod(1);
			} else if (e.detail === "newunfollow") {
				/*
				> When the user clicks the unfollow button
				set the followMod to -1, this will be used to subtract 1 from
				the follower count and also change the button to follow
				*/
				let dif = 0;
				const fmod = getFMod();
				if (fmod.set) {
					dif = fmod.value;
				}

				//decrease the absolute fmod by 1 bc we just removed a follower
				setFMod((dif - 1).toString());
				//trigger a rerender and change to follow button
				setFollowMod(-1);
			} else if (e.detail === "edittoggle") {
				//sent by the form submit button in the sidebar profile edit form
				setShowEditForm(false);
			} else {
				//reset fmod in local storage
				//setLastFMod("");
				const fmod = getFMod();
				if (fmod.set) {
					setFMod("");
				}
				//update to change the profile shown without link change
				setSideProf(e.detail);
				//we just switched to showing a different user's profile,
				//(possibly with our profile's edit form still open), so
				//remove the edit form and show that user's data normally
				setShowEditForm(false);
				//*yes, the 2 above both rerender, but both are still run!
			}
		};
		setTimeout(() => {
			//add event listener to the sidebar which
			//listens for events telling to update sidebar
			//the source of these dispatched events are socialhoots.ts
			const side = document.getElementById("sidebar");

			if (side) {
				side.addEventListener("updateSidebar", handleUpdate);
			}
		}, 1000);

		return () => {
			//remove listener on unmount
			const side = document.getElementById("sidebar");

			if (side) {
				side.removeEventListener("updateSidebar", handleUpdate);
			}
		};
	}, []);

	//the following ifesle will determine buttons loaded
	let buttons: any = null;

	if (uTag !== null && uTag !== "" && uTag !== payload?.tag) {
		//possibly logged in, possibly showing other profile (100% not ours)
		const { data, loading, error } = useFindMinProfileByTagQuery({
			variables: {
				tagInput: uTag,
			},
		});

		if (loading && !data) {
			return loadingSidebar;
		}
		if (!data.findUserByTag) {
			//fix site crashing bc above condition passes when the data is still ull
			//we have to wait a little bit more so that a user is returned
			return loadingSidebar;
		}
		if (error) {
			return (
				<div className={hardEdge ? sidebarStyles.sidebar_full : sidebarStyles.sidebar}>
					<p>{error.message}</p>
				</div>
			);
		}

		user = data.findUserByTag;

		if (loggedIn) {
			const handleFollow = async (id: string) => {
				//when user clicks the follow button, increase the
				//follower number of the current user bc it will
				//not realize the new follow until next page reload

				try {
					const response = await followUser({
						variables: {
							targetId: id,
						},
					});

					if (response && response.data) {
						//check if the operation went through w/o errors
						if (response.data.follow.success) {
							//when user clicks the follow button, increase
							//the follower number of the current user bc it
							//will not realize the new follow until next reload
							updateSidebar("newfollow");
							return;
						}
					}
				} catch (error) {
					console.log(error);
				}
				return;
			};

			const handleUnfollow = async (id: string) => {
				//when user clicks the follow button, increase the
				//follower number of the current user bc it will
				//not realize the new follow until next page reload
				//DO this first so bc the waiting for the mutation breaks lastfmod reset

				try {
					const response = await unfollowUser({
						variables: {
							targetId: id,
						},
					});

					if (response && response.data) {
						//check if the operation went through w/o errors
						if (response.data.unfollow.success) {
							//when user clicks the follow button, increase
							//the follower number of the current user bc it
							//will not realize the new follow until next reload
							updateSidebar("newunfollow");
						}
					}
				} catch (error) {
					console.log(error);
				}

				return;
			};

			//transfer the user to one with the type def, so we
			//get intellisense for this next operation.
			const userWtypes: MinProfUserType = user;
			const userFollowerList = userWtypes.profile.followerIds;

			//use this to show the unfollow button instead of the follow
			let showUnfollow: boolean;

			switch (followMod) {
				case 1:
					//just clicked follow, change to unfollow button
					showUnfollow = true;
					break;
				case -1:
					//just unfollowed, change to follow button
					showUnfollow = false;
					break;
				default:
					//Following status has not changed, just persist the current status:
					//Check if we follow the displayed user (if we are among their followers)
					showUnfollow = userFollowerList.includes(payload.id);
					break;
			}

			buttons ??= (
				<>
					{showUnfollow ? (
						<TextButton colorKey="red" text="Unfollow" action={() => handleUnfollow(user._id)} />
					) : (
						<TextButton colorKey="gold" text="Follow" action={() => handleFollow(user._id)} />
					)}
					<TextButton colorKey="green" text="Friend" />
				</>
			);
		} else {
			//we are not logged in, show buttons w/o actions
			buttons ??= (
				<>
					<TextButton colorKey="gold" text="Follow" />
					<TextButton colorKey="green" text="Friend" />
				</>
			);
		}
	} else if (loggedIn) {
		//logged in, no selected, so show self ORwe searched for ourselves
		const { data, loading, error } = useMyAccountMinProfileQuery();
		if (loading && !data) {
			return loadingSidebar;
		}
		if (error) {
			return <div>An error has occured</div>;
		}

		//after data fetch
		user = data.myAccount;

		buttons = (
			<>
				<TextButton colorKey="gold" text="Edit Profile" action={() => setShowEditForm(true)} />
			</>
		);
	} else {
		//logged out, show random
		const { data, loading, error } = useRandomMinProfileQuery();

		if (loading && !data) {
			return loadingSidebar;
		}
		if (error) {
			return <div>An error has occured</div>;
		}

		//after data fetch
		user = data.randomUser;
		buttons = (
			<>
				<TextButton colorKey="gold" text="Follow" />
				<TextButton colorKey="green" text="Friend" />
			</>
		);
	}

	//by default, we assume no modification to the follow count is needed
	let fcountAddition = 0;
	//wrap this in if logged in bc only logged in users have the ability to
	//change follower counts so this logic does not apply to guests
	if (loggedIn) {
		//get the current absolute change to the original follow count
		const fmod = getFMod();
		if (fmod.set) {
			//if this value is not "" (therefore no change), we apply the change
			fcountAddition = fmod.value;
		}
	}

	return (
		<div id="sidebar" className={hardEdge ? sidebarStyles.sidebar_full : sidebarStyles.sidebar}>
			<SimpleBar className="fillfill">
				{/*Banner*/}
				<div className={sidebarStyles.banner}>
					<Image loader={bannerLoader} className={sidebarStyles.bannerImage} alt="profile banner" src={user.profile.bannerUrl} layout="fill" priority={true} objectFit="cover" />
				</div>
				{/*User Profile*/}
				<div className={sidebarStyles.profileContainer}>
					<div className={sidebarStyles.p_cvlayoutzero}>
						{/*layout group with pfp & followers/ing*/}
						<div className={sidebarStyles.p_chlayout15}>
							<div className={sidebarStyles.p_stats}>
								<p className={sidebarStyles.p_stats_num}>{user.profile.followingIds.length}</p>
								<p className={sidebarStyles.p_stats_label}>Following</p>
							</div>
							<ProfilePicture size="large" source={user.profile.pictureUrl} status={user.status} />
							{/* FOLLOWER COUNT */}
							<div className={sidebarStyles.p_stats}>
								<p className={sidebarStyles.p_stats_num}>{user.profile.followerIds.length + fcountAddition}</p>
								<p className={sidebarStyles.p_stats_label}>Followers</p>
							</div>
						</div>
						{/*name & badges*/}
						{showEditForm ? null : (
							<>
								<NameGroup username={user.account.username} size={1} showBadges={true} badges={user.profile.badges} />
								<p className={sidebarStyles.p_tag}>@{user.account.tag}</p>
							</>
						)}
					</div>

					{showEditForm ? (
						<ProfileEditForm name={user.account.username} tag={user.account.tag} description={user.profile.description} />
					) : (
						<>
							<p className={sidebarStyles.p_description}>{user.profile.description}</p>
							<div className={sidebarStyles.buttonContainer}>{buttons}</div>
						</>
					)}

					{/* Following/Friend List */}
					<SocialList followingIds={user.profile.followingIds} friendIds={user.profile.friendIds} />
				</div>
			</SimpleBar>
		</div>
	);
};

export default Sidebar;
