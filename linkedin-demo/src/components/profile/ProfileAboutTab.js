import React from "react";
import { Divider, Typography } from "@material-ui/core";
import EducationSection from "./EducationSection";
import ExperienceSection from "./ExperienceSection";
import SkillsSection from "./SkillsSection";

const ProfileAboutTab = ({
  sectionClassName,
  about,
  renderBasicRichText,
  isOwnProfile,
  experienceEntries,
  legacyExperience,
  isExperienceSavePending,
  isExperienceDialogOpen,
  editingExperienceId,
  experienceFormData,
  onOpenCreateExperienceDialog,
  onOpenEditExperienceDialog,
  onRemoveExperience,
  onCloseExperienceDialog,
  onSaveExperience,
  onExperienceFieldChange,
  onExperienceCompanyChange,
  educationEntries,
  isEducationSavePending,
  isEducationDialogOpen,
  editingEducationId,
  educationFormData,
  onOpenCreateEducationDialog,
  onOpenEditEducationDialog,
  onRemoveEducation,
  onCloseEducationDialog,
  onSaveEducation,
  onEducationFieldChange,
  skills,
  skillInputValue,
  skillError,
  isSkillMutationPending,
  primaryColor,
  onSkillInputChange,
  onAddSkill,
  onRemoveSkill,
}) => (
  <div className={sectionClassName}>
    <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 6 }}>
      About
    </Typography>
    <Typography variant="body2" color="textSecondary" component="div" style={{ lineHeight: 1.65 }}>
      {renderBasicRichText(about, "No about information yet.")}
    </Typography>

    <Divider style={{ margin: "16px 0 12px" }} />

    <ExperienceSection
      isOwnProfile={isOwnProfile}
      experienceEntries={experienceEntries}
      legacyExperience={legacyExperience}
      isExperienceSavePending={isExperienceSavePending}
      isExperienceDialogOpen={isExperienceDialogOpen}
      editingExperienceId={editingExperienceId}
      experienceFormData={experienceFormData}
      onOpenCreateDialog={onOpenCreateExperienceDialog}
      onOpenEditDialog={onOpenEditExperienceDialog}
      onRemoveExperience={onRemoveExperience}
      onCloseDialog={onCloseExperienceDialog}
      onSaveExperience={onSaveExperience}
      onExperienceFieldChange={onExperienceFieldChange}
      onExperienceCompanyChange={onExperienceCompanyChange}
    />

    <EducationSection
      isOwnProfile={isOwnProfile}
      educationEntries={educationEntries}
      isEducationSavePending={isEducationSavePending}
      isEducationDialogOpen={isEducationDialogOpen}
      editingEducationId={editingEducationId}
      educationFormData={educationFormData}
      primaryColor={primaryColor}
      onOpenCreateDialog={onOpenCreateEducationDialog}
      onOpenEditDialog={onOpenEditEducationDialog}
      onRemoveEducation={onRemoveEducation}
      onCloseDialog={onCloseEducationDialog}
      onSaveEducation={onSaveEducation}
      onEducationFieldChange={onEducationFieldChange}
    />

    <SkillsSection
      isOwnProfile={isOwnProfile}
      skills={skills}
      skillInputValue={skillInputValue}
      skillError={skillError}
      isSkillMutationPending={isSkillMutationPending}
      primaryColor={primaryColor}
      onSkillInputChange={onSkillInputChange}
      onAddSkill={onAddSkill}
      onRemoveSkill={onRemoveSkill}
    />
  </div>
);

export default ProfileAboutTab;
