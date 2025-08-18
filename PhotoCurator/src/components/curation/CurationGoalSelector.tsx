/**
 * CurationGoalSelector - Component for selecting and customizing curation goals
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Slider
} from 'react-native';
import {
  CurationGoal,
  CurationWeights
} from '../../types';

interface CurationGoalSelectorProps {
  selectedGoal: CurationGoal;
  onGoalChange: (goal: CurationGoal) => void;
  customWeights?: CurationWeights;
  onWeightsChange?: (weights: CurationWeights) => void;
  showCustomization?: boolean;
}

const goalDescriptions: Record<CurationGoal, string> = {
  [CurationGoal.BEST_SCENIC]: 'Prioritizes landscape and scenic photos with strong composition',
  [CurationGoal.BEST_PORTRAITS]: 'Focuses on photos with people, emphasizing face quality and expressions',
  [CurationGoal.MOST_CREATIVE]: 'Selects unique and artistic photos with interesting compositions',
  [CurationGoal.BEST_TECHNICAL]: 'Emphasizes technical quality like sharpness, exposure, and color',
  [CurationGoal.MOST_EMOTIONAL]: 'Prioritizes photos with emotional content and expressions',
  [CurationGoal.BALANCED]: 'Balanced approach considering all factors equally'
};

const goalIcons: Record<CurationGoal, string> = {
  [CurationGoal.BEST_SCENIC]: '🏞️',
  [CurationGoal.BEST_PORTRAITS]: '👤',
  [CurationGoal.MOST_CREATIVE]: '🎨',
  [CurationGoal.BEST_TECHNICAL]: '⚙️',
  [CurationGoal.MOST_EMOTIONAL]: '😊',
  [CurationGoal.BALANCED]: '⚖️'
};

export const CurationGoalSelector: React.FC<CurationGoalSelectorProps> = ({
  selectedGoal,
  onGoalChange,
  customWeights,
  onWeightsChange,
  showCustomization = false
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [tempWeights, setTempWeights] = useState<CurationWeights>(
    customWeights || {
      qualityWeight: 0.25,
      compositionWeight: 0.25,
      contentWeight: 0.25,
      uniquenessWeight: 0.15,
      emotionalWeight: 0.1
    }
  );

  const getGoalDisplayName = (goal: CurationGoal): string => {
    switch (goal) {
      case CurationGoal.BEST_SCENIC:
        return 'Best Scenic';
      case CurationGoal.BEST_PORTRAITS:
        return 'Best Portraits';
      case CurationGoal.MOST_CREATIVE:
        return 'Most Creative';
      case CurationGoal.BEST_TECHNICAL:
        return 'Best Technical';
      case CurationGoal.MOST_EMOTIONAL:
        return 'Most Emotional';
      case CurationGoal.BALANCED:
        return 'Balanced';
      default:
        return 'Unknown';
    }
  };

  const handleGoalSelect = (goal: CurationGoal) => {
    onGoalChange(goal);
  };

  const handleCustomizeWeights = () => {
    setShowCustomModal(true);
  };

  const handleSaveWeights = () => {
    // Normalize weights to ensure they sum to 1
    const total = Object.values(tempWeights).reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights: CurationWeights = {
      qualityWeight: tempWeights.qualityWeight / total,
      compositionWeight: tempWeights.compositionWeight / total,
      contentWeight: tempWeights.contentWeight / total,
      uniquenessWeight: tempWeights.uniquenessWeight / total,
      emotionalWeight: tempWeights.emotionalWeight / total
    };

    onWeightsChange?.(normalizedWeights);
    setShowCustomModal(false);
  };

  const handleWeightChange = (key: keyof CurationWeights, value: number) => {
    setTempWeights(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderGoalOption = (goal: CurationGoal) => {
    const isSelected = selectedGoal === goal;
    
    return (
      <TouchableOpacity
        key={goal}
        style={[
          styles.goalOption,
          isSelected && styles.selectedGoalOption
        ]}
        onPress={() => handleGoalSelect(goal)}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalIcon}>{goalIcons[goal]}</Text>
          <Text style={[
            styles.goalTitle,
            isSelected && styles.selectedGoalTitle
          ]}>
            {getGoalDisplayName(goal)}
          </Text>
        </View>
        <Text style={[
          styles.goalDescription,
          isSelected && styles.selectedGoalDescription
        ]}>
          {goalDescriptions[goal]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWeightSlider = (
    label: string,
    key: keyof CurationWeights,
    value: number
  ) => {
    return (
      <View style={styles.sliderContainer} key={key}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{label}</Text>
          <Text style={styles.sliderValue}>{(value * 100).toFixed(0)}%</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={value}
          onValueChange={(newValue) => handleWeightChange(key, newValue)}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#E0E0E0"
          thumbStyle={styles.sliderThumb}
        />
      </View>
    );
  };

  const renderCustomizationModal = () => {
    const totalWeight = Object.values(tempWeights).reduce((sum, weight) => sum + weight, 0);
    
    return (
      <Modal
        visible={showCustomModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowCustomModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customize Weights</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveWeights}
            >
              <Text style={[styles.modalButtonText, styles.saveButtonText]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Adjust the importance of each factor in photo curation. 
              Higher values mean more emphasis on that aspect.
            </Text>

            {renderWeightSlider('Quality', 'qualityWeight', tempWeights.qualityWeight)}
            {renderWeightSlider('Composition', 'compositionWeight', tempWeights.compositionWeight)}
            {renderWeightSlider('Content', 'contentWeight', tempWeights.contentWeight)}
            {renderWeightSlider('Uniqueness', 'uniquenessWeight', tempWeights.uniquenessWeight)}
            {renderWeightSlider('Emotional', 'emotionalWeight', tempWeights.emotionalWeight)}

            <View style={styles.totalWeightContainer}>
              <Text style={styles.totalWeightLabel}>
                Total Weight: {(totalWeight * 100).toFixed(0)}%
              </Text>
              <Text style={styles.totalWeightNote}>
                Weights will be automatically normalized when saved
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Curation Goal</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.goalsScrollView}
      >
        {Object.values(CurationGoal).map(goal => renderGoalOption(goal))}
      </ScrollView>

      {showCustomization && (
        <TouchableOpacity
          style={styles.customizeButton}
          onPress={handleCustomizeWeights}
        >
          <Text style={styles.customizeButtonText}>Customize Weights</Text>
        </TouchableOpacity>
      )}

      {renderCustomizationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20
  },
  goalsScrollView: {
    paddingHorizontal: 15
  },
  goalOption: {
    width: 200,
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9'
  },
  selectedGoalOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD'
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 10
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  selectedGoalTitle: {
    color: '#007AFF'
  },
  goalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  selectedGoalDescription: {
    color: '#555'
  },
  customizeButton: {
    marginTop: 15,
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center'
  },
  customizeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  modalButton: {
    padding: 5
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF'
  },
  saveButtonText: {
    fontWeight: '600'
  },
  modalContent: {
    flex: 1,
    padding: 20
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 30
  },
  sliderContainer: {
    marginBottom: 25
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  sliderValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  slider: {
    width: '100%',
    height: 40
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20
  },
  totalWeightContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 8
  },
  totalWeightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5
  },
  totalWeightNote: {
    fontSize: 14,
    color: '#666'
  }
});