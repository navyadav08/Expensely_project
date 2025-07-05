import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { API } from '../services/api';

export default function GroupsScreen() {
  const [groupName, setGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  
  const [billDescription, setBillDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  const userId = 'dummyuser123';

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await API.get(`/groups/user/${userId}`);
      setGroups(response.data);
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const handleAddMember = () => {
    if (memberEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(memberEmail.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return;
      }

      if (members.includes(memberEmail.trim())) {
        Alert.alert('Duplicate Member', 'This member is already added');
        return;
      }

      setMembers([...members, memberEmail.trim()]);
      setMemberEmail('');
    }
  };

  const removeMember = (emailToRemove) => {
    setMembers(members.filter(email => email !== emailToRemove));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (members.length === 0) {
      Alert.alert('Error', 'Please add at least one member');
      return;
    }

    try {
      await API.post('/groups', {
        name: groupName.trim(),
        members,
        createdBy: userId,
        bills: [],
        createdAt: new Date().toISOString(),
      });
      setGroupName('');
      setMembers([]);
      fetchGroups();
      Alert.alert('Success', 'Group created successfully!');
    } catch (err) {
      console.error('Failed to create group', err);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const handleCreateBill = async () => {
    if (!billDescription.trim() || !billAmount.trim()) {
      Alert.alert('Error', 'Please fill in all bill details');
      return;
    }

    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const memberCount = selectedGroup?.members?.length || 1;
      const splitAmount = amount / memberCount;
      const bill = {
        description: billDescription.trim(),
        totalAmount: amount,
        splitAmount: splitAmount,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        payments: selectedGroup.members.map(member => ({
          memberEmail: member,
          amount: splitAmount,
          paid: false,
          paidAt: null,
        })),
      };

      await API.post(`/groups/${selectedGroup._id}/bills`, bill);

      setBillDescription('');
      setBillAmount('');
      setBillModalVisible(false);
      fetchGroups();
      Alert.alert('Success', 'Bill created and split among members!');
    } catch (err) {
      console.error('Failed to create bill', err);
      Alert.alert('Error', 'Failed to create bill. Please try again.');
    }
  };

  const handleMarkPaid = async (billId, memberEmail) => {
    try {
      await API.patch(`/groups/${selectedGroup._id}/bills/${billId}/payment`, {
        memberEmail,
        paid: true,
        paidAt: new Date().toISOString(),
      });

      fetchGroups();
      Alert.alert('Success', 'Payment marked as paid!');
    } catch (err) {
      console.error('Failed to mark payment', err);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const sendReminder = async (billId, memberEmail) => {
    try {
      await API.post(`/groups/${selectedGroup._id}/bills/${billId}/reminder`, {
        memberEmail,
        billDescription: selectedBill?.description,
        amount: selectedBill?.payments?.find(p => p.memberEmail === memberEmail)?.amount,
      });

      Alert.alert('Success', 'Reminder sent successfully!');
    } catch (err) {
      console.error('Failed to send reminder', err);
      Alert.alert('Error', 'Failed to send reminder');
    }
  };

  const renderGroupItem = ({ item }) => (
    <View style={styles.groupItem}>
      <Text style={styles.groupName}>{item.name}</Text>
      <Text style={styles.memberCount}>{item.members?.length || 0} members</Text>
      <Text style={styles.billCount}>{item.bills?.length || 0} bills</Text>

      <View style={styles.groupActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => {
            setSelectedGroup(item);
            setBillModalVisible(true);
          }}
        >
          <Text style={styles.actionBtnText}>Add Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#28a745' }]}
          onPress={() => {
            setSelectedGroup(item);
            setPaymentModalVisible(true);
            setSelectedBill(null);
          }}
        >
          <Text style={styles.actionBtnText}>View Bills</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBillItem = ({ item }) => (
    <View style={styles.billItem}>
      <Text style={styles.billDescription}>{item.description}</Text>
      <Text style={styles.billAmount}>Total: ${item.totalAmount.toFixed(2)}</Text>
      <Text style={styles.splitAmount}>Split: ${item.splitAmount.toFixed(2)} per person</Text>

      <View style={styles.paymentsContainer}>
        <Text style={styles.paymentsHeader}>Payment Status:</Text>
        {item.payments.map((payment, index) => (
          <View key={index} style={styles.paymentRow}>
            <Text style={styles.memberEmail}>{payment.memberEmail}</Text>
            <Text style={[
              styles.paymentStatus,
              { color: payment.paid ? '#28a745' : '#dc3545' }
            ]}>
              {payment.paid ? '✓ Paid' : '✗ Pending'}
            </Text>

            {!payment.paid && (
              <View style={styles.paymentActions}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#28a745' }]}
                  onPress={() => handleMarkPaid(item._id, payment.memberEmail)}
                >
                  <Text style={styles.smallBtnText}>Mark Paid</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#ffc107' }]}
                  onPress={() => {
                    setSelectedBill(item);
                    sendReminder(item._id, payment.memberEmail);
                  }}
                >
                  <Text style={styles.smallBtnText}>Remind</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Create New Group</Text>

      <TextInput
        placeholder="Group Name"
        value={groupName}
        onChangeText={setGroupName}
        style={styles.input}
      />

      <View style={styles.row}>
        <TextInput
          placeholder="Add Member Email"
          value={memberEmail}
          onChangeText={setMemberEmail}
          style={[styles.input, { flex: 1, marginRight: 10 }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={handleAddMember} style={styles.addBtn}>
          <Text style={styles.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {members.map((email, index) => (
        <View key={index} style={styles.memberRow}>
          <Text style={styles.memberText}>👤 {email}</Text>
          <TouchableOpacity
            onPress={() => removeMember(email)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.submitBtn} onPress={handleCreateGroup}>
        <Text style={styles.submitText}>CREATE GROUP</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Your Groups</Text>

      {groups.length === 0 ? (
        <Text style={styles.noGroupText}>No groups yet.</Text>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroupItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bill Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={billModalVisible}
        onRequestClose={() => setBillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Bill</Text>

            <TextInput
              placeholder="Bill Description (e.g., Dinner at Restaurant)"
              value={billDescription}
              onChangeText={setBillDescription}
              style={styles.input}
            />

            <TextInput
              placeholder="Total Amount"
              value={billAmount}
              onChangeText={setBillAmount}
              style={styles.input}
              keyboardType="numeric"
            />

            <Text style={styles.splitInfo}>
              {selectedGroup?.members?.length && billAmount ?
                `Split among ${selectedGroup.members.length} members: $${(parseFloat(billAmount) / selectedGroup.members.length).toFixed(2)} each`
                : 'Enter amount to see split'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#6c757d' }]}
                onPress={() => setBillModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleCreateBill}
              >
                <Text style={styles.modalBtnText}>Create Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGroup?.name} - Bills
            </Text>

            {selectedGroup?.bills?.length === 0 ? (
              <Text style={styles.noBillsText}>No bills in this group yet.</Text>
            ) : (
              <FlatList
                data={selectedGroup?.bills || []}
                keyExtractor={(item) => item._id}
                renderItem={renderBillItem}
                showsVerticalScrollIndicator={false}
              />
            )}

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#6c757d', marginTop: 10 }]}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fc',
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  memberText: {
    color: '#333',
    fontSize: 16,
  },
  removeBtn: {
    backgroundColor: '#dc3545',
    padding: 4,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 15,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noGroupText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  groupItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupName: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  billCount: {
    color: '#666',
    fontSize: 14,
    marginBottom: 12,
  },
  groupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    padding: 10,
    borderRadius: 6,
    flex: 0.48,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  splitInfo: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalBtn: {
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noBillsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  billItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  billDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  billAmount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  splitAmount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  paymentsContainer: {
    marginTop: 10,
  },
  paymentsHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 5,
  },
  memberEmail: {
    flex: 1,
    fontSize: 14,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 10,
  },
  paymentActions: {
    flexDirection: 'row',
  },
  smallBtn: {
    padding: 6,
    borderRadius: 4,
    marginLeft: 5,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});